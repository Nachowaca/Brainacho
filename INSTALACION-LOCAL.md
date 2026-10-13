# Instalación en tu computadora (CCGS + Glade MCP para Godot)

## 1. Requisitos
- [Git](https://git-scm.com/)
- [Claude Code](https://code.claude.com/docs/en/setup)
- Python 3 (los skills y hooks de CCGS leen `project.yaml`)
- Bash (en Windows viene con Git for Windows)
- Recomendado: `jq`
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (para Glade)
  - Mac/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
  - Windows: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`
- Godot 4.3+ (Glade no soporta la versión C#/Mono todavía)

## 2. Clonar la rama
```
git clone https://github.com/nachowaca/brainacho.git
cd brainacho
git checkout ccr-9c1fd7eb-8lq573
```

## 3. Claude Code Game Studios (ya incluido en `.claude/`)
1. Abre Claude Code dentro de la carpeta del repo: `claude`
2. Corre `/setup-engine` y elige Godot 4 + GDScript.
3. Los agentes y skills se cargan solos.

## 4. Glade MCP
1. Servidor MCP: ya está en `.mcp.json` (Claude Code te pedirá aprobarlo).
   Alternativa global:
   - Mac/Linux: `claude mcp add --transport stdio gladekit-mcp --scope user -- uvx gladekit-mcp`
   - Windows: `claude mcp add --transport stdio gladekit-mcp --scope user -- cmd /c uvx gladekit-mcp`
2. Addon del editor: copia `tools/glade-godot-bridge/addons/com.gladekit.mcp-bridge/`
   a `<tu-proyecto-godot>/addons/`.
3. En Godot: Project → Project Settings → Plugins → activa **GladeKit MCP Bridge**.
4. En el panel Output debe aparecer:
   `[GladeKit MCP Bridge] listening on ws://127.0.0.1:8766`
5. Con el editor abierto, en Claude Code corre `/mcp` y verifica que `gladekit-mcp` esté conectado.

## 5. Problemas comunes
- Si no encuentra `uvx`: agrega la carpeta de uv al PATH o usa `pip install gladekit-mcp`
  con `"command": "python", "args": ["-m", "gladekit_mcp"]`.
- Si hay Unity y Godot abiertos a la vez: `GLADEKIT_MCP_FORCE_ENGINE=godot` (ya fijado en `.mcp.json`).
- Glade solo funciona con el editor de Godot abierto.

## 6. Fuentes
- https://github.com/Donchitos/Claude-Code-Game-Studios
- https://github.com/Glade-tool/glade-mcp
