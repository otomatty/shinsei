#!/usr/bin/env python3
"""
OSSとカスタマイズ版の高度な差分分析ツール
"""

import os
import sys
import json
import csv
import argparse
import difflib
import hashlib
import mimetypes
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
import re

class DiffAnalyzer:
    """差分分析を行うメインクラス"""

    def __init__(self, oss_dir: str, custom_dir: str):
        self.oss_dir = Path(oss_dir)
        self.custom_dir = Path(custom_dir)
        self.results = {
            'added': [],
            'removed': [],
            'modified': [],
            'metadata': {
                'oss_dir': str(self.oss_dir),
                'custom_dir': str(self.custom_dir),
                'analysis_time': datetime.now().isoformat(),
                'total_files_oss': 0,
                'total_files_custom': 0
            }
        }

        # 除外パターン（正規表現）
        self.exclude_patterns = [
            r'node_modules',
            r'\.git',
            r'\.DS_Store',
            r'dist',
            r'build',
            r'\.nyc_output',
            r'coverage',
            r'\.vscode',
            r'\.idea',
            r'\.log$',
            r'\.tmp$',
            r'\.min\.js$',
            r'\.map$',
            r'\.lock$',
            r'package-lock\.json$',
            r'yarn\.lock$',
            r'\.pyc$',
            r'__pycache__',
            r'\.pytest_cache'
        ]

        # サポートされるファイル拡張子とその分類
        self.file_categories = {
            'code': {'.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.go', '.rs', '.rb', '.php'},
            'config': {'.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.env'},
            'style': {'.css', '.scss', '.sass', '.less', '.styl'},
            'markup': {'.html', '.htm', '.xml', '.svg', '.md', '.rst'},
            'data': {'.csv', '.tsv', '.sql', '.db', '.sqlite'},
            'image': {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.ico', '.webp'},
            'doc': {'.txt', '.md', '.rst', '.pdf', '.doc', '.docx'},
            'other': set()
        }

    def should_exclude(self, file_path: str) -> bool:
        """ファイルを除外するかどうかを判定"""
        for pattern in self.exclude_patterns:
            if re.search(pattern, file_path):
                return True
        return False

    def get_file_category(self, file_path: Path) -> str:
        """ファイルのカテゴリを取得"""
        suffix = file_path.suffix.lower()
        for category, extensions in self.file_categories.items():
            if suffix in extensions:
                return category
        return 'other'

    def get_file_hash(self, file_path: Path) -> str:
        """ファイルのハッシュを計算"""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except (OSError, IOError):
            return ""

    def get_file_stats(self, file_path: Path) -> Dict:
        """ファイルの統計情報を取得"""
        try:
            stat = file_path.stat()
            stats = {
                'size': stat.st_size,
                'mtime': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                'category': self.get_file_category(file_path),
                'hash': self.get_file_hash(file_path),
            }

            # テキストファイルの場合、行数を取得
            if self.is_text_file(file_path):
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        stats['lines'] = sum(1 for _ in f)
                except (OSError, IOError):
                    stats['lines'] = 0

            return stats
        except (OSError, IOError):
            return {}

    def is_text_file(self, file_path: Path) -> bool:
        """テキストファイルかどうかを判定"""
        try:
            mime_type, _ = mimetypes.guess_type(str(file_path))
            if mime_type and mime_type.startswith('text/'):
                return True

            # バイナリファイルの簡単な判定
            with open(file_path, 'rb') as f:
                chunk = f.read(1024)
                if b'\x00' in chunk:
                    return False

            return True
        except (OSError, IOError):
            return False

    def get_all_files(self, directory: Path) -> Set[str]:
        """ディレクトリ内の全ファイルを取得"""
        files = set()
        for file_path in directory.rglob('*'):
            if file_path.is_file():
                relative_path = file_path.relative_to(directory)
                if not self.should_exclude(str(relative_path)):
                    files.add(str(relative_path))
        return files

    def analyze_differences(self) -> Dict:
        """差分分析を実行"""
        print("🔍 差分分析を開始します...")

        # 全ファイルリストを取得
        oss_files = self.get_all_files(self.oss_dir)
        custom_files = self.get_all_files(self.custom_dir)

        self.results['metadata']['total_files_oss'] = len(oss_files)
        self.results['metadata']['total_files_custom'] = len(custom_files)

        # 新規追加されたファイル
        added_files = custom_files - oss_files
        print(f"📝 新規追加: {len(added_files)}件")

        # 削除されたファイル
        removed_files = oss_files - custom_files
        print(f"🗑️ 削除: {len(removed_files)}件")

        # 変更されたファイル
        common_files = oss_files & custom_files
        print(f"🔄 変更チェック対象: {len(common_files)}件")

        # 結果を格納
        for file_path in added_files:
            full_path = self.custom_dir / file_path
            self.results['added'].append({
                'path': file_path,
                'stats': self.get_file_stats(full_path)
            })

        for file_path in removed_files:
            full_path = self.oss_dir / file_path
            self.results['removed'].append({
                'path': file_path,
                'stats': self.get_file_stats(full_path)
            })

        # 変更されたファイルをチェック
        modified_count = 0
        for file_path in common_files:
            oss_file = self.oss_dir / file_path
            custom_file = self.custom_dir / file_path

            oss_stats = self.get_file_stats(oss_file)
            custom_stats = self.get_file_stats(custom_file)

            # ハッシュで比較
            if oss_stats.get('hash') != custom_stats.get('hash'):
                modified_count += 1

                # 詳細な差分情報を取得
                diff_info = self.get_detailed_diff(oss_file, custom_file)

                self.results['modified'].append({
                    'path': file_path,
                    'oss_stats': oss_stats,
                    'custom_stats': custom_stats,
                    'diff_info': diff_info
                })

        print(f"✏️ 変更されたファイル: {modified_count}件")
        print("✅ 差分分析が完了しました")

        return self.results

    def get_detailed_diff(self, oss_file: Path, custom_file: Path) -> Dict:
        """詳細な差分情報を取得"""
        if not self.is_text_file(oss_file) or not self.is_text_file(custom_file):
            return {'type': 'binary', 'summary': 'バイナリファイル'}

        try:
            with open(oss_file, 'r', encoding='utf-8', errors='ignore') as f:
                oss_lines = f.readlines()

            with open(custom_file, 'r', encoding='utf-8', errors='ignore') as f:
                custom_lines = f.readlines()

            # 差分を計算
            diff = list(difflib.unified_diff(
                oss_lines, custom_lines,
                fromfile=f'oss/{oss_file.name}',
                tofile=f'custom/{custom_file.name}',
                lineterm=''
            ))

            # 統計情報を計算
            added_lines = sum(1 for line in diff if line.startswith('+') and not line.startswith('+++'))
            removed_lines = sum(1 for line in diff if line.startswith('-') and not line.startswith('---'))

            return {
                'type': 'text',
                'added_lines': added_lines,
                'removed_lines': removed_lines,
                'total_changes': added_lines + removed_lines,
                'diff_preview': diff[:20]  # 最初の20行のみ保存
            }

        except (OSError, IOError, UnicodeDecodeError):
            return {'type': 'error', 'summary': 'ファイル読み取りエラー'}

    def generate_summary(self) -> Dict:
        """サマリー情報を生成"""
        summary = {
            'total_added': len(self.results['added']),
            'total_removed': len(self.results['removed']),
            'total_modified': len(self.results['modified']),
            'categories': {}
        }

        # カテゴリ別の統計
        for category in self.file_categories.keys():
            summary['categories'][category] = {
                'added': 0,
                'removed': 0,
                'modified': 0
            }

        # 追加されたファイルの分類
        for item in self.results['added']:
            category = item['stats'].get('category', 'other')
            summary['categories'][category]['added'] += 1

        # 削除されたファイルの分類
        for item in self.results['removed']:
            category = item['stats'].get('category', 'other')
            summary['categories'][category]['removed'] += 1

        # 変更されたファイルの分類
        for item in self.results['modified']:
            category = item['custom_stats'].get('category', 'other')
            summary['categories'][category]['modified'] += 1

        return summary

def export_to_json(results: Dict, output_file: str):
    """JSON形式でエクスポート"""
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"📄 JSONレポートを生成しました: {output_file}")

def export_to_csv(results: Dict, output_file: str):
    """CSV形式でエクスポート"""
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Type', 'Path', 'Category', 'Size', 'Lines', 'Changes'])

        for item in results['added']:
            writer.writerow([
                'Added',
                item['path'],
                item['stats'].get('category', ''),
                item['stats'].get('size', ''),
                item['stats'].get('lines', ''),
                ''
            ])

        for item in results['removed']:
            writer.writerow([
                'Removed',
                item['path'],
                item['stats'].get('category', ''),
                item['stats'].get('size', ''),
                item['stats'].get('lines', ''),
                ''
            ])

        for item in results['modified']:
            changes = item.get('diff_info', {}).get('total_changes', '')
            writer.writerow([
                'Modified',
                item['path'],
                item['custom_stats'].get('category', ''),
                item['custom_stats'].get('size', ''),
                item['custom_stats'].get('lines', ''),
                changes
            ])

    print(f"📊 CSVレポートを生成しました: {output_file}")

def export_to_html(results: Dict, output_file: str):
    """HTML形式でエクスポート"""
    summary = DiffAnalyzer("", "").generate_summary()
    summary.update({
        'total_added': len(results['added']),
        'total_removed': len(results['removed']),
        'total_modified': len(results['modified'])
    })

    html_content = f"""
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>高度な差分分析レポート</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #333;
            border-bottom: 3px solid #007acc;
            padding-bottom: 10px;
        }}
        .summary {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }}
        .card {{
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }}
        .card-number {{
            font-size: 2em;
            font-weight: bold;
            color: #007acc;
        }}
        .file-list {{
            margin: 20px 0;
        }}
        .file-item {{
            padding: 8px;
            margin: 5px 0;
            border-radius: 4px;
            font-family: monospace;
        }}
        .added {{ background-color: #d4edda; color: #155724; }}
        .removed {{ background-color: #f8d7da; color: #721c24; }}
        .modified {{ background-color: #fff3cd; color: #856404; }}
        .category {{
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
            background-color: #e9ecef;
            color: #495057;
        }}
        .filter-buttons {{
            margin: 20px 0;
        }}
        .filter-btn {{
            padding: 8px 16px;
            margin: 2px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            background-color: #007acc;
            color: white;
        }}
        .filter-btn:hover {{
            background-color: #005a9c;
        }}
        .filter-btn.active {{
            background-color: #0056b3;
        }}
        .hidden {{
            display: none;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 高度な差分分析レポート</h1>

        <div class="summary">
            <div class="card">
                <div class="card-number">{summary['total_added']}</div>
                <div>新規追加</div>
            </div>
            <div class="card">
                <div class="card-number">{summary['total_removed']}</div>
                <div>削除</div>
            </div>
            <div class="card">
                <div class="card-number">{summary['total_modified']}</div>
                <div>変更</div>
            </div>
        </div>

        <div class="filter-buttons">
            <button class="filter-btn active" onclick="filterFiles('all')">全て</button>
            <button class="filter-btn" onclick="filterFiles('added')">追加</button>
            <button class="filter-btn" onclick="filterFiles('removed')">削除</button>
            <button class="filter-btn" onclick="filterFiles('modified')">変更</button>
        </div>

        <div class="file-list">
"""

    # ファイル一覧を追加
    for item in results['added']:
        category = item['stats'].get('category', 'other')
        html_content += f"""
            <div class="file-item added" data-type="added">
                <span class="category">{category}</span>
                + {item['path']}
            </div>
        """

    for item in results['removed']:
        category = item['stats'].get('category', 'other')
        html_content += f"""
            <div class="file-item removed" data-type="removed">
                <span class="category">{category}</span>
                - {item['path']}
            </div>
        """

    for item in results['modified']:
        category = item['custom_stats'].get('category', 'other')
        changes = item.get('diff_info', {}).get('total_changes', '')
        html_content += f"""
            <div class="file-item modified" data-type="modified">
                <span class="category">{category}</span>
                M {item['path']} ({changes} changes)
            </div>
        """

    html_content += """
        </div>
    </div>

    <script>
        function filterFiles(type) {
            const items = document.querySelectorAll('.file-item');
            const buttons = document.querySelectorAll('.filter-btn');

            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            items.forEach(item => {
                if (type === 'all' || item.dataset.type === type) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        }
    </script>
</body>
</html>
"""

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"🌐 HTMLレポートを生成しました: {output_file}")

def main():
    parser = argparse.ArgumentParser(
        description='OSSとカスタマイズ版の高度な差分分析ツール',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  python diff-analyzer.py /path/to/oss /path/to/custom
  python diff-analyzer.py /path/to/oss /path/to/custom --format json
  python diff-analyzer.py /path/to/oss /path/to/custom --format html --output report.html
        """
    )

    parser.add_argument('oss_dir', help='元のOSSディレクトリパス')
    parser.add_argument('custom_dir', help='カスタマイズ版ディレクトリパス')
    parser.add_argument('--format', '-f', choices=['console', 'json', 'csv', 'html'],
                       default='console', help='出力形式')
    parser.add_argument('--output', '-o', help='出力ファイル名')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='詳細な出力を表示')

    args = parser.parse_args()

    # ディレクトリの存在チェック
    if not os.path.exists(args.oss_dir):
        print(f"❌ エラー: OSSディレクトリが存在しません: {args.oss_dir}")
        sys.exit(1)

    if not os.path.exists(args.custom_dir):
        print(f"❌ エラー: カスタムディレクトリが存在しません: {args.custom_dir}")
        sys.exit(1)

    # 分析を実行
    analyzer = DiffAnalyzer(args.oss_dir, args.custom_dir)
    results = analyzer.analyze_differences()

    # 出力形式に応じて結果を出力
    if args.format == 'console':
        print_console_report(results)
    elif args.format == 'json':
        output_file = args.output or f"diff_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        export_to_json(results, output_file)
    elif args.format == 'csv':
        output_file = args.output or f"diff_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        export_to_csv(results, output_file)
    elif args.format == 'html':
        output_file = args.output or f"diff_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        export_to_html(results, output_file)

def print_console_report(results: Dict):
    """コンソール形式でレポートを出力"""
    print("\n" + "="*60)
    print("📊 差分分析レポート")
    print("="*60)

    metadata = results['metadata']
    print(f"📁 OSS Dir: {metadata['oss_dir']}")
    print(f"📁 Custom Dir: {metadata['custom_dir']}")
    print(f"🕐 分析時刻: {metadata['analysis_time']}")
    print(f"📄 OSS総ファイル数: {metadata['total_files_oss']}")
    print(f"📄 Custom総ファイル数: {metadata['total_files_custom']}")

    print(f"\n📝 新規追加されたファイル: {len(results['added'])}件")
    for item in results['added']:
        category = item['stats'].get('category', 'other')
        size = item['stats'].get('size', 0)
        print(f"  + {item['path']} [{category}] ({size} bytes)")

    print(f"\n🗑️ 削除されたファイル: {len(results['removed'])}件")
    for item in results['removed']:
        category = item['stats'].get('category', 'other')
        size = item['stats'].get('size', 0)
        print(f"  - {item['path']} [{category}] ({size} bytes)")

    print(f"\n✏️ 変更されたファイル: {len(results['modified'])}件")
    for item in results['modified']:
        category = item['custom_stats'].get('category', 'other')
        diff_info = item.get('diff_info', {})
        changes = diff_info.get('total_changes', '?')
        print(f"  M {item['path']} [{category}] ({changes} changes)")

if __name__ == '__main__':
    main()
