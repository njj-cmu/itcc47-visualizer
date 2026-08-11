# Setting up your computer

**ITCC47 – Data Structures and Algorithms**

You need three things on your own laptop this semester: **Python 3**, **Git**,
and a **code editor**. This folder checks whether you have them and tells you
exactly what to do about anything missing.

Do this on your **personal laptop**. The computer laboratory machines are
locked down and you generally cannot install software on them.

> You do **not** need any of this to use the Algorithm Visualizer. That runs in
> your browser with no setup at all — open `index.html` and start. This page is
> for the laboratory work, where you write and test real Python programs.

## Step 1 — Run the check

Double-click **`Check My Computer.cmd`**.

A window opens, runs through everything, and then a report appears in your
browser with a green, amber or red result for each item.

Nothing is installed and nothing on your computer is changed. It only looks.

If you prefer the terminal, or the double-click does nothing:

```powershell
powershell -ExecutionPolicy Bypass -File doctor.ps1
```

## Step 2 — Fix whatever it flags

Work down the report from the top. Anything marked **Fix** is required;
anything marked **Check** is a suggestion you can leave for later.

Each item has a download button and says what to do. Two of the steps cannot be
automated, and they are the two that cause the most trouble:

**Installing Python — tick "Add python.exe to PATH".** It is a small unticked
box at the bottom of the very first installer screen. If you miss it, Python
installs correctly but Windows cannot find it, and every command fails with
*"python is not recognized"*. If that has already happened, run the installer
again and choose Modify.

**Turning off the Microsoft Store placeholder.** Windows ships fake `python.exe`
and `python3.exe` files that do nothing but open the Microsoft Store. They sit
ahead of the real Python, so you can have Python installed and still have
nothing work. The check detects this and tells you if it applies to you. To turn
them off: **Settings → Apps → Advanced app settings → App execution aliases**,
then switch off both `python.exe` and `python3.exe`.

### If you want it installed for you

If your Windows has App Installer (most Windows 11 does), the script can install
the missing pieces itself:

```powershell
powershell -ExecutionPolicy Bypass -File doctor.ps1 -Install
```

It lists what it is about to install and waits for you to confirm. It never
installs anything you did not agree to.

## Step 3 — Run the check again

**Close the terminal window and open a new one first.** A program you just
installed is invisible to any window that was already open — this is normal
Windows behaviour and it is the single most common reason the check still fails
right after a successful install.

You are done when the banner says **Ready**.

That means more than "the files are on your disk". The check writes a small
program, runs it, feeds it input, and confirms the output came back exactly
right. When it says Ready, your computer has genuinely run a Python program the
way the laboratory exercises will.

## Later in the semester

Once your instructor gives you the **ITCC47-Laboratory-Package** folder, put it
in your `Documents` folder and run the check once more. It will find the
package's own test runner, run a sample case through it, and confirm that works
too.

If you keep the package somewhere else:

```powershell
powershell -ExecutionPolicy Bypass -File doctor.ps1 -PackagePath "D:\path\to\ITCC47-Laboratory-Package"
```

## When something is still wrong

**"...cannot be loaded because running scripts is disabled on this system"**
Use the full command with `-ExecutionPolicy Bypass` shown above rather than
right-clicking the `.ps1` file. That flag applies to that single run only.

**"python is not recognized"**
Either Python is not installed, or it was installed without *Add python.exe to
PATH*. Run the check — it tells you which.

**Typing `python` opens the Microsoft Store**
That is the placeholder described in Step 2. Turn off the app execution aliases,
or use `py -3` instead of `python`.

**The check passed yesterday and fails today**
Almost always a second Python install, or a Windows update re-enabling the app
execution aliases. Run the check and read what it says about which Python it
found.

**Still stuck**
Bring the report with you. Open the report page, press **Ctrl+P**, save it as a
PDF, and send that — it lists your Windows build, your Python version and
exactly which checks failed, which is far quicker to help with than a
screenshot of an error message.
