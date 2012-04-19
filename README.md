## Randomiser: generating random conditions

In all kinds of research it is necessary to counterbalance or randomise expertimental conditions to avoid biases.
Simply using the random functions in spreadsheet software may indeed give a random condition for each cell,
but it does not check whether each condition is represented an equal amount of times.
This is why I made this simple webform to help out.
Using this form below you can generate a randomised order for the conditions specified and save this to a file.

###Demo
Go and see my working version here: [http://www.sinds1984.nl/extra/randomiser/](http://www.sinds1984.nl/extra/randomiser/).

The webpage expects a modern webbrowser. It uses some simple HTML5 additions such as the _button_ element. This means IE8 and lower are out of luck (surprise!).

###Installation
If you want to use some or all of the code here, just copy the files to a webserver.
Because downloading to a file requires some server processing (it cannot be done straight from Javascript) the webform sends file contents to a server-side script which returns that info as a downloadable file.
If the webserver is enabled to process PHP files the webform should work rightaway with *output.php*.
Perl may be a bit more work, thus if you desire to use *output.pl* it must be moved to your */cgi-bin/* folder on the webserver.
Also adjust the file permissions (chmod) to *755* on a Linux/Unix/Mac server.
Finally the action attribute of the form should be adjusted to match the new *output.pl* location.
For Windows servers the first line in *output.pl* may need adjustment as well.

###Some coding notes
This is a cleaned up version of older code which does not depend on any JS frameworks.
If you do use these (such as MooTools or jQuery) it is probably good to have a look at the helper functions in randomiser.js.
A framework may have alternative versions of these functions that could interfere.

###License
I have no specific license in mind, so feel free to do with it as you desire. It would be kind (but not necessary) to let me know.