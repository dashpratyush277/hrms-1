import 'package:flutter/material.dart';

class TasksScreen extends StatelessWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListView.builder(
        itemCount: 0,
        itemBuilder: (context, index) {
          return const ListTile(
            title: Text('Task'),
            subtitle: Text('Description'),
          );
        },
      ),
    );
  }
}

