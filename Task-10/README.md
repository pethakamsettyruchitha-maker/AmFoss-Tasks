INSTALLING FLUTTER:

First I have installed flutter then I have added the extension in vs code then I followed the instructions given in the flutter website and finally created a file for the app Image grid app.
I made many mistakes in installing flutter but the I took a little help of Gemini to clear the problems in installing the flutter. One more issue that I faced was the internet. It failed many times but I started the whole process again.

ABOUT THE APP:

This app basically allows the user to upload a image and get a grid on top of it.

It has a option to change the no. of rows and columns and also the color of the grid and display the number on the grid 

It also has the toggle bar to enable the number display on each box in the grid

WHAT I HAVE USED IN THE APP.

Image picker — imports a picture from the gallery using the image_picker package.

instead of sliders, the number of rows, columns, and line thickness are typed directly into text fields and applied with a button to make it simple.


Cell numbering — a switch that overlays a small 'row,column' label on every cell, making it easier to find the matching square while drawing.

the grid is drawn directly on top of the image using a 'Stack + CustomPainter', so it updates immediately whenever a value changes

Originally used Slider widgets to control rows, columns, and line thickness, but switched to TextField + TextEditingController so the user could type exact numbers instead of dragging. Added an "Update Grid" button that reads and parses the text only when tapped.


Kept shouldRepaint simple by always returning true, so the grid always redraws when the widget rebuilds, rather than manually comparing every property.


PROBLEMS THAT I HAVE FACED:

Grid not lining up with the image — early on, the grid was drawn based on the full screen size rather than the actual size of the displayed image, so the lines didn't match the picture underneath. Wrapping the image and grid together in a Stack with Positioned.fill fixed this, since the CustomPaint now sizes itself to match the image's layout box.

