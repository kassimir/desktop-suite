This is a project I was working on for a while to completely change my PC desktop with Electron and Autohotkey. It worked as a completely customizable desktop environment that interacted with specific mouse movements and buttons. I usxe a Razer Naga Trinity with 12 buttons on the side, and each of those buttons did different things.

That said, when I tried to commit my changes, there was an issue with my computer, and it corrupted a large chunk of my updated code. Because of this, I pretty much just stopped working on it. I would like to revisit it one day, but I think this kind of application would be best written in something like C# (or C++ or C), and I would love to jump into that, because I have a huge interest in C#, but I am also working on a private repo for a site that is very near and dear to my heart.

![image](https://github.com/user-attachments/assets/cdc39efe-67d6-4283-a894-96f9e9ea8afc)

Larger version of this image is here: https://i.imgur.com/ga6Q910.jpeg

Top bar has a clock in the middle, shortcuts on the left, and video shortcuts on the right. The options are Netflix, Hulu, Amazon Prime, and Funimation. When you choose a streaming service, the other options disappear for video controls.

The video player is a custom streaming video player, which is insanely difficult to make, considering DRM software is required for streaming.

The Notepad is just a Notepad. I have a custom WindowBlinds theme (yes, that's still a thing).

The video controls to the right of that pop up via middle mouse button click and only pop up during a streaming session. Otherwise the menu shows all tasks currently running. Once the menu pops up, using the scroll wheel will spin the items on the menu, highlighting them in the middle.

The left side is a pop out that is normally hidden, but will pop out by clicking the #7 on my mouse. Clicking #8 while the window is popped out will move my mouse to that panel. While the mouse is hovering the panel, I can either click the numbers for the tabs, or I can scroll the mouse wheel to scroll through the tabs. First panel is computer info, second is more shortcuts, and third is a dynamically-created list of games based on selected libraries (like steamapps). Clicking the #7 while the panel is open will close the panel and return the mouse to its original position before hitting #7 on the mouse.
