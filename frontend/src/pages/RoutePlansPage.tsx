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
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add,
  Edit,
  Visibility,
  CheckCircle,
  Cancel,
  AccessTime,
  LocationOn,
  FilterList,
} from '@mui/icons-material';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';

interface RoutePlan {
  id: string;
  employee: { firstName: string; lastName: string; employeeId: string };
  date: string;
  plannedVisits: number;
  completedVisits: number;
  routeItems: RouteItem[];
  notes?: string;
}

interface RouteItem {
  id: string;
  doctor: { id: string; name: string; clinicName?: string; address?: string };
  sequence: number;
  plannedTime?: string;
  actualTime?: string;
  status: 'PENDING' | 'VISITED' | 'SKIPPED';
  notes?: string;
}

export function RoutePlansPage() {
  const [open, setOpen] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<RoutePlan | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER' || user?.role === 'HR_ADMIN' || user?.role === 'TENANT_ADMIN';

  const [formData, setFormData] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    items: [] as Array<{ doctorId: string; plannedTime: string }>,
  });

  // Fetch employees for manager
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data?.data || [];
    },
    enabled: isManager,
  });

  // Fetch approved doctors
  const { data: doctors } = useQuery({
    queryKey: ['doctors-approved'],
    queryFn: async () => {
      const res = await api.get('/doctors', { params: { status: 'APPROVED' } });
      return res.data;
    },
  });

  // Fetch route plans
  const { data: routePlans, isLoading } = useQuery({
    queryKey: ['route-plans', employeeFilter, dateFilter],
    queryFn: async () => {
      const params: any = {};
      if (employeeFilter) params.employeeId = employeeFilter;
      if (dateFilter) params.startDate = dateFilter;
      const res = await api.get('/route-plans', { params });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/route-plans', {
        ...data,
        employeeId: data.employeeId,
        items: data.items.map((item: any, index: number) => ({
          doctorId: item.doctorId,
          plannedTime: item.plannedTime || undefined,
        })),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Route plan created successfully');
      queryClient.invalidateQueries({ queryKey: ['route-plans'] });
      setOpen(false);
      setFormData({
        employeeId: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [],
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create route plan');
    },
  });

  const handleAddDoctor = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { doctorId: '', plannedTime: '' }],
    });
  };

  const handleRemoveDoctor = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleDoctorChange = (index: number, doctorId: string) => {
    const newItems = [...formData.items];
    newItems[index].doctorId = doctorId;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = () => {
    if (!formData.employeeId || !formData.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Please add at least one doctor to the route');
      return;
    }

    createMutation.mutate(formData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VISITED':
        return 'success';
      case 'SKIPPED':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const filteredPlans = routePlans || [];

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
        <Typography variant="h4">Route Plans</Typography>
        {isManager && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Create Route Plan
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {isManager && (
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Employee</InputLabel>
                  <Select
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                    label="Employee"
                  >
                    <MenuItem value="">All</MenuItem>
                    {employees?.map((emp: any) => (
                      <MenuItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setEmployeeFilter('');
                  setDateFilter('');
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Route Plans List */}
      <Grid container spacing={2}>
        {filteredPlans.length === 0 ? (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" align="center">
                  No route plans found
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          filteredPlans.map((plan: RoutePlan) => {
            const completionRate = plan.plannedVisits > 0 
              ? (plan.completedVisits / plan.plannedVisits) * 100 
              : 0;

            return (
              <Grid item xs={12} key={plan.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                      <Box>
                        <Typography variant="h6">
                          {new Date(plan.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {plan.employee.firstName} {plan.employee.lastName} ({plan.employee.employeeId})
                        </Typography>
                      </Box>
                      <Box display="flex" gap={1}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedPlan(plan);
                              setViewDialog(true);
                            }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Box mb={2}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">
                          Visits: {plan.completedVisits} / {plan.plannedVisits}
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {completionRate.toFixed(0)}%
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={completionRate} />
                    </Box>

                    <Box display="flex" gap={1} flexWrap="wrap">
                      {plan.routeItems.slice(0, 5).map((item: RouteItem) => (
                        <Chip
                          key={item.id}
                          label={`${item.sequence}. ${item.doctor.name}`}
                          color={getStatusColor(item.status) as any}
                          size="small"
                        />
                      ))}
                      {plan.routeItems.length > 5 && (
                        <Chip label={`+${plan.routeItems.length - 5} more`} size="small" />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>

      {/* Create Route Plan Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Route Plan</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Employee *</InputLabel>
                <Select
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  label="Employee *"
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
              <TextField
                fullWidth
                type="date"
                label="Date *"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2">Route Items (in order)</Typography>
                <Button size="small" onClick={handleAddDoctor}>
                  Add Doctor
                </Button>
              </Box>
              {formData.items.length === 0 ? (
                <Alert severity="info">Click "Add Doctor" to add doctors to the route</Alert>
              ) : (
                <List>
                  {formData.items.map((item, index) => (
                    <ListItem key={index}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={1}>
                          <Typography variant="body2" fontWeight="medium">
                            #{index + 1}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={5}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Doctor</InputLabel>
                            <Select
                              value={item.doctorId}
                              onChange={(e) => handleDoctorChange(index, e.target.value)}
                              label="Doctor"
                            >
                              {doctors?.map((doctor: any) => (
                                <MenuItem key={doctor.id} value={doctor.id}>
                                  {doctor.name} {doctor.clinicName && `- ${doctor.clinicName}`}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            size="small"
                            type="time"
                            label="Planned Time"
                            value={item.plannedTime}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[index].plannedTime = e.target.value;
                              setFormData({ ...formData, items: newItems });
                            }}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveDoctor(index)}
                          >
                            <Cancel fontSize="small" />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </ListItem>
                  ))}
                </List>
              )}
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
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <CircularProgress size={20} /> : 'Create Route Plan'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Route Plan Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Route Plan Details</DialogTitle>
        <DialogContent>
          {selectedPlan && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2} mb={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedPlan.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Employee
                  </Typography>
                  <Typography variant="body1">
                    {selectedPlan.employee.firstName} {selectedPlan.employee.lastName}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Progress
                  </Typography>
                  <Typography variant="body1">
                    {selectedPlan.completedVisits} / {selectedPlan.plannedVisits} visits completed
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(selectedPlan.completedVisits / selectedPlan.plannedVisits) * 100}
                    sx={{ mt: 1 }}
                  />
                </Grid>
              </Grid>

              <Typography variant="subtitle1" gutterBottom>
                Route Items
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Doctor</TableCell>
                      <TableCell>Planned Time</TableCell>
                      <TableCell>Actual Time</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPlan.routeItems.map((item: RouteItem) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.sequence}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.doctor.name}
                          </Typography>
                          {item.doctor.clinicName && (
                            <Typography variant="caption" color="textSecondary">
                              {item.doctor.clinicName}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.plannedTime ? (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <AccessTime fontSize="small" />
                              <Typography variant="body2">
                                {new Date(item.plannedTime).toLocaleTimeString()}
                              </Typography>
                            </Box>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {item.actualTime ? (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <AccessTime fontSize="small" />
                              <Typography variant="body2">
                                {new Date(item.actualTime).toLocaleTimeString()}
                              </Typography>
                            </Box>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.status}
                            color={getStatusColor(item.status) as any}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
