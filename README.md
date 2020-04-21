## Features
- Scan all open chrome windows for tabs that have a youtube video in them.  Choose the one to track and it will write the tab's title to a file along with whether or not the tab is audible.
- The script cleans up all the downloads and history it's responsible for after it errors/you hit "stop"
- The debug action can be used to test the file I/O without the youtube step (have to open this from `chrome://extensions`)
- The dump action can be used to peer into the script's current memory contents for troubleshooting (have to open this from `chrome://extensions`)

## Instructions
### Installation
1. Make a clone of this project, unzipped.
2. Open Chrome Browser
3. Navigate to `chrome://extensions/` in your browser, like it's a web url
4. At the top right corner of the page, **enable** `Developer Mode`
5. Click the button on the page that says `Load Unpacked`
6. Navigate to your unzipped project folder and select that and hit OK.

### Usage
1. Scan for youtube tabs
2. Choose the tab you want
3. Every 15 seconds, the file called `~/Downloads/youtube-song.txt` will be refreshed with the chosen tab's title

## Troubleshooting
- because this operates via file downloads, you'll want to make sure chrome has permission to download files without asking you where to put them.  This is found at `chrome://settings`