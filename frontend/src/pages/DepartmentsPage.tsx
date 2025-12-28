import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  Grid,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import api from '../lib/api';
import { toast } from 'react-toastify';

export function DepartmentsPage() {
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [deptFormData, setDeptFormData] = useState({ name: '', code: '' });
  const queryClient = useQueryClient();

  const { data: departments, isLoading: deptLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/employees/departments/list');
      return res.data;
    },
  });

  const createDepartmentMutation = useMutation({
    mutationFn: async (data: { name: string; code: string }) => {
      const res = await api.post('/employees/departments', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Department created successfully');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setDeptDialogOpen(false);
      setDeptFormData({ name: '', code: '' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create department');
    },
  });

  if (deptLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Departments</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDeptDialogOpen(true)}
          >
            Add Department
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {departments?.length > 0 ? (
              departments.map((dept: any) => (
                <TableRow key={dept.id}>
                  <TableCell>{dept.code}</TableCell>
                  <TableCell>{dept.name}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} align="center">
                  No departments found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Department Creation Dialog */}
      <Dialog open={deptDialogOpen} onClose={() => setDeptDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Department</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Department Name *"
                  value={deptFormData.name}
                  onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Department Code *"
                  value={deptFormData.code}
                  onChange={(e) => setDeptFormData({ ...deptFormData, code: e.target.value.toUpperCase() })}
                  required
                  helperText="Unique code for the department (e.g., HR, IT, SALES)"
                  inputProps={{ maxLength: 10 }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeptDialogOpen(false); setDeptFormData({ name: '', code: '' }); }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (!deptFormData.name || !deptFormData.code) {
                toast.error('Please fill in all required fields');
                return;
              }
              createDepartmentMutation.mutate(deptFormData);
            }}
            disabled={createDepartmentMutation.isPending}
          >
            {createDepartmentMutation.isPending ? <CircularProgress size={24} /> : 'Create Department'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

