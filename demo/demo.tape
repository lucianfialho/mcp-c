# VHS demo tape for spec2cli
# Prerequisites:
#   1. npm install -g spec2cli
#   2. node examples/todo-api/server.mjs running on port 4000
# Run: vhs demo/demo.tape

Output demo/demo.gif

Set Shell "bash"
Set FontSize 15
Set Width 900
Set Height 550
Set Theme "Catppuccin Mocha"
Set Padding 15
Set TypingSpeed 40ms
Set CursorBlink false

# Show help
Type "spec2cli --spec api.yaml --help"
Enter
Sleep 2.5s

# List with table
Type "spec2cli --spec api.yaml --base-url http://localhost:4000 --output table todos list"
Enter
Sleep 2.5s

# Filter pending
Type "spec2cli --spec api.yaml --base-url http://localhost:4000 --output table todos list --status pending"
Enter
Sleep 2.5s

# Get as YAML
Type "spec2cli --spec api.yaml --base-url http://localhost:4000 --output yaml todos get --id 1"
Enter
Sleep 2.5s

# Create with auth
Type "spec2cli --spec api.yaml --base-url http://localhost:4000 --token test-token-123 --output json todos create --title 'Ship v1' --priority high"
Enter
Sleep 2.5s

# Search registry
Type "spec2cli search payments"
Enter
Sleep 2.5s

# Agent help
Type "spec2cli --spec api.yaml --agent-help"
Enter
Sleep 4s

Sleep 1s
