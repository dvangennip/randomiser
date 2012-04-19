#!/usr/bin/perl -w

use strict;
use warnings;

use CGI::Carp qw(fatalsToBrowser);
use CGI;
my $cgi_object = new CGI;
$cgi_object->charset('UTF-8');

# All external variables are gathered here
#
my $outputType = $cgi_object->param("t");
my $fileContent = $cgi_object->param("f");
my $fileName = $cgi_object->param("n");
my $requestMethod = $cgi_object->request_method;

# Determine whether this is a valid request
# ($ok should still be 0 after all checks)
#
my $ok = 0;
# Only POST requests are accepted
unless ($requestMethod eq "POST") {
	$ok = ($ok+1);
}
# a file name must be of the form <some word characters>.<an extension>
unless ($fileName =~ /^\w+\.\w{2,5}$/) {
	$fileName = "error.txt";
}
# content must have some length
unless (length($fileContent) > 0) {
	$fileContent = "No content was given";
}

# Printing to browser
#
# printing header with octet-stream as content type, so a browser will accept it as a file
print $cgi_object->header(-type=>'application/octet-stream', -charset=>'utf-8', -attachment=>$fileName);
if ($ok == 0) {
	print $fileContent;
} else {
	print "Only POST requests are supported (error code: $ok)";
}