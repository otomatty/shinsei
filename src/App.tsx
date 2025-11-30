import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ThemeProvider, CssBaseline } from "@mui/material";
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
} from "@mui/material";

// Lichtblickのテーマを使用
import { createMuiTheme } from "@lichtblick/theme";

// テストコンポーネント
import { TauriBridgeTest } from "./components/TauriBridgeTest";
import { WindowBridgeTest } from "./components/WindowBridgeTest";

// Lichtblickのダークテーマを作成
const darkTheme = createMuiTheme("dark");

type TestView = "none" | "tauri" | "window";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [testView, setTestView] = useState<TestView>("none");

  async function greet() {
    try {
      setGreetMsg(await invoke("greet", { name }));
    } catch (error) {
      console.error("Failed to invoke greet:", error);
      setGreetMsg("Error: Failed to greet");
    }
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container maxWidth="sm">
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: 3,
          }}
        >
          <Typography variant="h3" component="h1" gutterBottom>
            Shinsei
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Lichtblick Tauri Migration - Phase 1
          </Typography>

          <Paper
            elevation={3}
            sx={{
              p: 4,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              label="Enter a name"
              variant="outlined"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  greet();
                }
              }}
            />
            <Button
              variant="contained"
              onClick={greet}
              sx={{ alignSelf: "flex-end" }}
            >
              Greet
            </Button>
            {greetMsg && (
              <Typography variant="body1" sx={{ mt: 2 }}>
                {greetMsg}
              </Typography>
            )}
          </Paper>

          <Button
            variant="outlined"
            onClick={() => setTestView(testView === "tauri" ? "none" : "tauri")}
            sx={{ mt: 2 }}
          >
            {testView === "tauri" ? "テストを隠す" : "TauriBridge テストを表示"}
          </Button>

          <Button
            variant="outlined"
            onClick={() =>
              setTestView(testView === "window" ? "none" : "window")
            }
            sx={{ mt: 1 }}
          >
            {testView === "window"
              ? "テストを隠す"
              : "WindowBridge テストを表示"}
          </Button>

          {testView === "tauri" && (
            <Paper elevation={3} sx={{ p: 2, width: "100%", mt: 2 }}>
              <TauriBridgeTest />
            </Paper>
          )}

          {testView === "window" && (
            <Paper elevation={3} sx={{ p: 2, width: "100%", mt: 2 }}>
              <WindowBridgeTest />
            </Paper>
          )}

          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <a
              href="https://tauri.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/tauri.svg" alt="Tauri logo" width="60" />
            </a>
            <a
              href="https://react.dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/react.svg" alt="React logo" width="60" />
            </a>
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
