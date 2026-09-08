<!--
Source: https://code.visualstudio.com/docs/terminal/basics
Fetched from microsoft/vscode-docs (branch main), 2026-09-08.
Licensed under the Creative Commons Attribution 3.0 United States License
(https://creativecommons.org/licenses/by/3.0/us/legalcode), (c) Microsoft
Corporation. Excerpt: the introduction and "opening a terminal" section of
the page: the parts an editing-tool question in this course is likely to
need. The full page also covers shell selection, split panes, terminal
tabs in new windows and buffer navigation - see the source URL above.
Product name placeholders from the source templating have been resolved
to plain text ("VS Code"); nothing else has been reworded.
-->

# Terminal Basics

VS Code includes a full featured integrated terminal that starts at the root of your workspace. It provides integration with the editor to support features like links and error detection. The integrated terminal can run commands such as `mkdir` and `git` just like a standalone terminal.

> Opening a terminal is blocked when a workspace is in Restricted Mode, to prevent shells from automatically executing code based on workspace contents.

You can open a terminal as follows:

* From the menu, use the **Terminal > New Terminal** or **View > Terminal** menu commands.
* From the Command Palette, use the **View: Toggle Terminal** command.
* In the Explorer, use the **Open in Integrated Terminal** context menu command to open a new terminal from a folder.
* Use the terminal's own keyboard shortcut to toggle the terminal panel, or to create a new terminal (the exact key combination depends on the platform and keyboard layout - check **File > Preferences > Keyboard Shortcuts** and search for "Toggle Terminal" or "Create New Terminal").

VS Code's terminal has additional functionality called shell integration that tracks where commands are run, with decorations on the left of a command and in the scrollbar.

## Terminal shells

The integrated terminal can use various shells installed on the machine, with the default pulled from the system defaults. Detected shells are presented in the terminal profiles dropdown, next to the "new terminal" button.
