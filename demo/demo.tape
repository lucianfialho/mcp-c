# VHS demo tape for spec2cli
# Prerequisites: node examples/todo-api/server.mjs running on port 4000
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
Type "npx spec2cli --spec api.yaml --help"
Enter
Sleep 3s

# List with table
Type "npx spec2cli --spec api.yaml --base-url http://localhost:4000 --output table todos list"
Enter
Sleep 3s

# Filter pending
Type "npx spec2cli --spec api.yaml --base-url http://localhost:4000 --output table todos list --status pending"
Enter
Sleep 3s

# Get as YAML
Type "npx spec2cli --spec api.yaml --base-url http://localhost:4000 --output yaml todos get --id 1"
Enter
Sleep 3s

# Create with auth
Type "npx spec2cli --spec api.yaml --base-url http://localhost:4000 --token test-token-123 --output json todos create --title 'Ship v1' --priority high"
Enter
Sleep 3s

# Search registry
Type "npx spec2cli search payments"
Enter
Sleep 3s

# Agent help
Type "npx spec2cli --spec api.yaml --agent-help"
Enter
Sleep 5s

Sleep 1s
