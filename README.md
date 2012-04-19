## Randomiser: generating random conditions

In all kinds of research it is necessary to counterbalance or randomise expertimental conditions to avoid biases.
Simply using the random functions in spreadsheet software may indeed give a random condition for each cell,
but it does not check whether each condition is represented an equal amount of times.
It means condition order is randomised but the goal of equally likely occurence of conditions is not met.
This is why I made this simple webform to help out.
Using the form on the included webpage you can generate a randomised order for the conditions specified and save this to a file.
Because the code first adds conditions in equal numbers and then shuffles the order.

####Limitations
The code does not counterbalance conditions such that condition A would be followed up by condition B as often as it is followed by C.
For small samples and a condition order susceptible to any spillover effects from previous conditions it may be useful to check the results.
Usually this only applies to within group order. For larger samples the random order will cancel out such anomalies.

###Demo
Go and see my working version here: [http://www.sinds1984.nl/extra/randomiser/](http://www.sinds1984.nl/extra/randomiser/).

The webpage expects a modern webbrowser. It uses some simple HTML5 additions such as the _button_ element.
This means IE8 and lower are probably out of luck (I wasn't able to verify this, but it seems likely).

###Installation
If you want to use some or all of the code here, just copy the files to your computer and open the HTML file in a browser.
Because downloading to a file requires some server processing (it cannot be done straight from Javascript, at least not with widely supported methods) the webform sends file contents to a server-side script which returns that info as a downloadable file.
If the webserver is enabled to process PHP files the webform should work rightaway with *output.php*.
Perl may require a bit more work, so if you desire to use *output.pl* it must be moved to your */cgi-bin/* folder on the webserver (or check your webserver's documentation).
Also adjust the file permissions (chmod) to *755* on a Linux/Unix/Mac server.
Finally the action attribute of the HTML form should be adjusted to match the new *output.pl* location.
For Windows servers the first line in *output.pl* may need adjustment as well.

###Some coding notes
This is a cleaned up version of older code. It does not depend on any JS frameworks.
If you do use these (such as MooTools or jQuery) it is probably good to have a look at the helper functions in randomiser.js.
A framework may have alternative versions of these functions that could interfere with the intended functionality.

###License
I have no specific license in mind, so feel free to do with it as you desire. It would be kind (but not necessary) to let me know.
Suggestions and improvements are welcome of course.