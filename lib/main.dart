import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Image Grid App',
      home: const GridHomePage(),
    );
  }
}

class GridHomePage extends StatefulWidget {
  const GridHomePage({super.key});

  @override
  State<GridHomePage> createState() => _GridHomePageState();
}

class _GridHomePageState extends State<GridHomePage> {
  File? selectedImage;

  int rows = 4;
  int columns = 4;
  double lineThickness = 2.0;
  Color gridColor = Colors.red;
  bool showNumbers = false;

  // Text controllers let us read what the user types in the boxes
  final TextEditingController rowsController = TextEditingController(text: '4');
  final TextEditingController columnsController = TextEditingController(text: '4');
  final TextEditingController thicknessController = TextEditingController(text: '2');

  // A few color choices to pick from
  final List<Color> colorOptions = [
    Colors.red,
    Colors.yellow,
    Colors.blue,
    Colors.black,
  ];

  // Opens the gallery so the user can pick an image
  Future<void> pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);

    if (pickedFile != null) {
      setState(() {
        selectedImage = File(pickedFile.path);
      });
    }
  }

  // Reads the numbers typed by the user and updates the grid
  void applyGridValues() {
    setState(() {
      rows = int.tryParse(rowsController.text) ?? rows;
      columns = int.tryParse(columnsController.text) ?? columns;
      lineThickness = double.tryParse(thicknessController.text) ?? lineThickness;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Image Grid App'),
      ),
      body: Column(
        children: [
          // Button to pick an image
          ElevatedButton(
            onPressed: pickImage,
            child: const Text('Pick an Image'),
          ),

          const SizedBox(height: 10),

          // Show the image with the grid on top of it
          if (selectedImage != null)
            Expanded(
              child: Stack(
                children: [
                  Image.file(selectedImage!, fit: BoxFit.contain),
                  Positioned.fill(
                    child: CustomPaint(
                      painter: GridPainter(
                        rows: rows,
                        columns: columns,
                        thickness: lineThickness,
                        color: gridColor,
                        showNumbers: showNumbers,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          // Controls to change the grid
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              children: [
                // Text box for rows
                TextField(
                  controller: rowsController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Number of Rows'),
                ),

                const SizedBox(height: 8),

                // Text box for columns
                TextField(
                  controller: columnsController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Number of Columns'),
                ),

                const SizedBox(height: 8),

                // Text box for line thickness
                TextField(
                  controller: thicknessController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Line Thickness'),
                ),

                const SizedBox(height: 10),

                // Button to apply the typed values to the grid
                ElevatedButton(
                  onPressed: applyGridValues,
                  child: const Text('Update Grid'),
                ),

                const SizedBox(height: 10),

                // Row of color buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: colorOptions.map((color) {
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          gridColor = color;
                        });
                      },
                      child: Container(
                        margin: const EdgeInsets.all(5),
                        width: 30,
                        height: 30,
                        color: color,
                      ),
                    );
                  }).toList(),
                ),

                // Switch to turn cell numbers on/off
                SwitchListTile(
                  title: const Text('Show Cell Numbers'),
                  value: showNumbers,
                  onChanged: (value) {
                    setState(() {
                      showNumbers = value;
                    });
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// This class draws the grid lines (and numbers) on the image
class GridPainter extends CustomPainter {
  final int rows;
  final int columns;
  final double thickness;
  final Color color;
  final bool showNumbers;

  GridPainter({
    required this.rows,
    required this.columns,
    required this.thickness,
    required this.color,
    required this.showNumbers,
  });

  @override
  void paint(Canvas canvas, Size size) {
    Paint paint = Paint()
      ..color = color
      ..strokeWidth = thickness;

    double cellWidth = size.width / columns;
    double cellHeight = size.height / rows;

    // Draw vertical lines
    for (int i = 0; i <= columns; i++) {
      double x = i * cellWidth;
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }

    // Draw horizontal lines
    for (int i = 0; i <= rows; i++) {
      double y = i * cellHeight;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }

    // Draw numbers in each cell if turned on
    if (showNumbers) {
      for (int r = 0; r < rows; r++) {
        for (int c = 0; c < columns; c++) {
          TextPainter textPainter = TextPainter(
            text: TextSpan(
              text: '${r + 1},${c + 1}',
              style: TextStyle(color: color, fontSize: 12),
            ),
            textDirection: TextDirection.ltr,
          );
          textPainter.layout();
          textPainter.paint(
            canvas,
            Offset(c * cellWidth + 3, r * cellHeight + 3),
          );
        }
      }
    }
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) {
    return true;
  }
}