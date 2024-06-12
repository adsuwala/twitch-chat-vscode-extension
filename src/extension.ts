import * as vscode from 'vscode';
import * as tmi from 'tmi.js';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('twitch.start', async () => {
            const channel = await vscode.window.showInputBox({
                prompt: 'Enter the Twitch channel name',
                placeHolder: 'Channel name'
            });

            if (!channel) {
                vscode.window.showErrorMessage('Channel name is required');
                return;
            }

            const panel = vscode.window.createWebviewPanel(
                'twitchChat',
                `Twitch Chat: ${channel}`,
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            const iconPath = vscode.Uri.parse('data:image/x-icon;base64,AAABAAEAEBAQAAEABAAoAQAAFgAAACgAAAAQAAAAIAAAAAEABAAAAAAAgAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAA//7+AP///wClQWQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMwAAAAAAAAAzMAAAAAAzMzIzMzAAADMzMiMzMwAAMyIiIiIjMAAzIiIiIiIzADMiIjIjEiMAMyIiMiMSIwAzIiIyIxIjADMiIjIjEiMAMyIiIiIiIwAzIiIiIiIjADMiIiIiIiMAMzMzMzMzMwAAAAAAAAAAD//wAA+f8AAPj/AACADwAAgAcAAIADAACAAQAAgAEAAIABAACAAQAAgAEAAIABAACAAQAAgAEAAIABAAD//wAA');
            panel.iconPath = iconPath;

            panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, channel);

            const client = new tmi.Client({
                channels: [channel]
            });

            client.connect();

            client.on('message', (channel, tags, message, self) => {
                panel.webview.postMessage({
                    type: 'newMessage',
                    user: tags['display-name'],
                    message: message
                });
            });

            vscode.window.onDidChangeActiveColorTheme(() => {
                panel.webview.html = getWebviewContent(panel.webview, context.extensionUri, channel);
            });
        })
    );
}

export function deactivate() {}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, channel: string) {
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <title>Twitch Chat</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https:; media-src https:; frame-src https://embed.twitch.tv https://player.twitch.tv; script-src 'nonce-${nonce}' https://embed.twitch.tv; style-src 'self' 'unsafe-inline' ${webview.cspSource};">
    <style>
        :root {
            --vscode-background: ${getCssVariable('editor.background')};
            --vscode-foreground: ${getCssVariable('editor.foreground')};
            --vscode-border: ${getCssVariable('panel.border')};
            --username-color: #1E90FF; 
        }
        body {
            background-color: var(--vscode-background);
            color: var(--vscode-foreground);
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: Arial, sans-serif;
            overflow-x: hidden;
        }
        #chat {
            width: 100%;
            height: 100vh;
            padding: 10px;
            overflow-y: auto;
            overflow-x: hidden;
            border: 1px solid var(--vscode-border);
            word-wrap: break-word; 
        }
        .message {
            padding: 5px;
            margin-bottom: 5px;
            border-bottom: 1px solid var(--vscode-border);
        }
        .message span.username {
            color: var(--username-color);
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div id="chat"></div>
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        function isScrolledToBottom(element) {
            return element.scrollHeight - element.clientHeight <= element.scrollTop + 1;
        }

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'newMessage') {
                const chat = document.getElementById('chat');
                const newMessage = document.createElement('div');
                newMessage.className = 'message';
                newMessage.innerHTML = \`<span class="username">\${message.user}:</span> \${message.message}\`;
                const wasScrolledToBottom = isScrolledToBottom(chat);
                chat.appendChild(newMessage);
                if (wasScrolledToBottom) {
                    chat.scrollTop = chat.scrollHeight;
                }
            }
        });
    </script>
</body>
</html>`;
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function getCssVariable(variable: string): string {
    return `var(--vscode-${variable.replace(/\./g, '-')})`;
}
