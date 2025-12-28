import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  TextField,
  IconButton,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CheckCircle,
  Visibility,
  FilterList,
  Flag,
} from '@mui/icons-material';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';

interface Task {
  id: string;
  title: string;
  description?: string;
  employee: { firstName: string; lastName: string; employeeId: string };
  doctor?: { id: string; name: string };
  campaign?: { id: string; name: string };
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate?: string;
  completedAt?: string;
  notes?: string;
}

export function TasksPage() {
  const [open, setOpen] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER' || user?.role === 'HR_ADMIN' || user?.role === 'TENANT_ADMIN';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    employeeId: '',
    doctorId: '',
    campaignId: '',
    priority: 'MEDIUM',
    dueDate: '',
    notes: '',
  });

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data?.data || [];
    },
    enabled: isManager,
  });

  // Fetch doctors
  const { data: doctors } = useQuery({
    queryKey: ['doctors-approved'],
    queryFn: async () => {
      const res = await api.get('/doctors', { params: { status: 'APPROVED' } });
      return res.data;
    },
  });

  // Fetch campaigns
  const { data: campaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await api.get('/campaigns');
      return res.data;
    },
  });

  // Fetch tasks
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter, priorityFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await api.get('/tasks', { params });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/tasks', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Task created successfully');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setOpen(false);
      setFormData({
        title: '',
        description: '',
        employeeId: '',
        doctorId: '',
        campaignId: '',
        priority: 'MEDIUM',
        dueDate: '',
        notes: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create task');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/tasks/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Task updated successfully');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditDialog(false);
      setSelectedTask(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update task');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/tasks/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Task deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete task');
    },
  });

  const handleSubmit = () => {
    if (!formData.title || !formData.employeeId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const data: any = {
      ...formData,
      dueDate: formData.dueDate || undefined,
      doctorId: formData.doctorId || undefined,
      campaignId: formData.campaignId || undefined,
    };

    if (selectedTask) {
      updateMutation.mutate({ id: selectedTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      employeeId: '',
      doctorId: task.doctor?.id || '',
      campaignId: '',
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      notes: task.notes || '',
    });
    setEditDialog(true);
  };

  const handleStatusChange = (taskId: string, status: string) => {
    updateMutation.mutate({
      id: taskId,
      data: { status },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'info';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'error';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'default';
      default:
        return 'default';
    }
  };

  const filteredTasks = tasks?.filter((task: Task) => {
    if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Tasks</Typography>
        {isManager && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Create Task
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="ALL">All</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  label="Priority"
                >
                  <MenuItem value="ALL">All</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="LOW">Low</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setStatusFilter('ALL');
                  setPriorityFilter('ALL');
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell>Doctor</TableCell>
              <TableCell>Campaign</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTasks?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="textSecondary">No tasks found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks?.map((task: Task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {task.title}
                    </Typography>
                    {task.description && (
                      <Typography variant="caption" color="textSecondary">
                        {task.description.substring(0, 50)}...
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.employee.firstName} {task.employee.lastName}
                  </TableCell>
                  <TableCell>{task.doctor?.name || '-'}</TableCell>
                  <TableCell>{task.campaign?.name || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      icon={<Flag />}
                      label={task.priority}
                      color={getPriorityColor(task.priority) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={task.status}
                      color={getStatusColor(task.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {task.dueDate ? (
                      <Typography
                        variant="body2"
                        color={
                          new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED'
                            ? 'error'
                            : 'inherit'
                        }
                      >
                        {new Date(task.dueDate).toLocaleDateString()}
                      </Typography>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedTask(task);
                            setViewDialog(true);
                          }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {task.status !== 'COMPLETED' && (
                        <Tooltip title="Mark Complete">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleStatusChange(task.id, 'COMPLETED')}
                          >
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {isManager && (
                        <>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleEdit(task)}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this task?')) {
                                  deleteMutation.mutate(task.id);
                                }
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Task Dialog */}
      <Dialog
        open={open || editDialog}
        onClose={() => {
          setOpen(false);
          setEditDialog(false);
          setSelectedTask(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{selectedTask ? 'Edit Task' : 'Create Task'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title *"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Assign To *</InputLabel>
                <Select
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  label="Assign To *"
                >
                  {employees?.map((emp: any) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  label="Priority"
                >
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="MEDIUM">Medium</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Doctor (Optional)</InputLabel>
                <Select
                  value={formData.doctorId}
                  onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                  label="Doctor (Optional)"
                >
                  <MenuItem value="">None</MenuItem>
                  {doctors?.map((doctor: any) => (
                    <MenuItem key={doctor.id} value={doctor.id}>
                      {doctor.name} {doctor.clinicName && `- ${doctor.clinicName}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Campaign (Optional)</InputLabel>
                <Select
                  value={formData.campaignId}
                  onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
                  label="Campaign (Optional)"
                >
                  <MenuItem value="">None</MenuItem>
                  {campaigns?.map((campaign: any) => (
                    <MenuItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Due Date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpen(false);
              setEditDialog(false);
              setSelectedTask(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {(createMutation.isPending || updateMutation.isPending) ? (
              <CircularProgress size={20} />
            ) : (
              selectedTask ? 'Update' : 'Create'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Task Details Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Task Details</DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Title
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedTask.title}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedTask.status}
                    color={getStatusColor(selectedTask.status) as any}
                    size="small"
                  />
                </Grid>
                {selectedTask.description && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">
                      Description
                    </Typography>
                    <Typography variant="body1">{selectedTask.description}</Typography>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Assigned To
                  </Typography>
                  <Typography variant="body1">
                    {selectedTask.employee.firstName} {selectedTask.employee.lastName}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Priority
                  </Typography>
                  <Chip
                    icon={<Flag />}
                    label={selectedTask.priority}
                    color={getPriorityColor(selectedTask.priority) as any}
                    size="small"
                  />
                </Grid>
                {selectedTask.doctor && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      Doctor
                    </Typography>
                    <Typography variant="body1">{selectedTask.doctor.name}</Typography>
                  </Grid>
                )}
                {selectedTask.campaign && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      Campaign
                    </Typography>
                    <Typography variant="body1">{selectedTask.campaign.name}</Typography>
                  </Grid>
                )}
                {selectedTask.dueDate && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      Due Date
                    </Typography>
                    <Typography
                      variant="body1"
                      color={
                        new Date(selectedTask.dueDate) < new Date() && selectedTask.status !== 'COMPLETED'
                          ? 'error'
                          : 'inherit'
                      }
                    >
                      {new Date(selectedTask.dueDate).toLocaleDateString()}
                    </Typography>
                  </Grid>
                )}
                {selectedTask.completedAt && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      Completed At
                    </Typography>
                    <Typography variant="body1">
                      {new Date(selectedTask.completedAt).toLocaleString()}
                    </Typography>
                  </Grid>
                )}
                {selectedTask.notes && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">
                      Notes
                    </Typography>
                    <Typography variant="body1">{selectedTask.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
          {selectedTask && selectedTask.status !== 'COMPLETED' && (
            <Button
              variant="contained"
              color="success"
              onClick={() => {
                handleStatusChange(selectedTask.id, 'COMPLETED');
                setViewDialog(false);
              }}
            >
              Mark Complete
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
