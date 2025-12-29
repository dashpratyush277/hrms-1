import 'package:flutter/material.dart';

class VisitsScreen extends StatelessWidget {
  const VisitsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: const Center(
        child: Text('Visits Screen'),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Start visit
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}

