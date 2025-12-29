import 'package:flutter/material.dart';

class LeaveScreen extends StatelessWidget {
  const LeaveScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: const Center(
        child: Text('Leave Screen'),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Apply leave
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}

