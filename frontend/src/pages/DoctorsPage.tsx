import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
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
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  CheckCircle,
  Cancel,
  LocationOn,
  Phone,
  Email,
} from '@mui/icons-material';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';

interface Doctor {
  id: string;
  name: string;
  specialization?: string;
  clinicName?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  proposedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

export function DoctorsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [open, setOpen] = useState(false);
  const [approveDialog, setApproveDialog] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER' || user?.role === 'HR_ADMIN' || user?.role === 'TENANT_ADMIN';

  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    clinicName: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    latitude: '',
    longitude: '',
    category: '',
    notes: '',
  });

  const { data: doctors, isLoading } = useQuery({
    queryKey: ['doctors', search, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await api.get('/doctors', { params });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/doctors', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Doctor created successfully');
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      setOpen(false);
      setFormData({
        name: '',
        specialization: '',
        clinicName: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        email: '',
        latitude: '',
        longitude: '',
        category: '',
        notes: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create doctor');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.patch(`/doctors/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Doctor updated successfully');
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      setOpen(false);
      setEditingDoctor(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update doctor');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'APPROVED' | 'REJECTED' }) => {
      const res = await api.patch(`/doctors/${id}/approve`, { status });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Doctor status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['doctors'] });
      setApproveDialog(false);
      setSelectedDoctor(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update doctor status');
    },
  });

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error('Please fill in doctor name');
      return;
    }

    const data: any = {
      ...formData,
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
    };

    if (editingDoctor) {
      updateMutation.mutate({ id: editingDoctor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      specialization: doctor.specialization || '',
      clinicName: doctor.clinicName || '',
      address: doctor.address || '',
      city: doctor.city || '',
      state: doctor.state || '',
      pincode: '',
      phone: doctor.phone || '',
      email: doctor.email || '',
      latitude: doctor.latitude?.toString() || '',
      longitude: doctor.longitude?.toString() || '',
      category: '',
      notes: doctor.notes || '',
    });
    setOpen(true);
  };

  const handleApprove = (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedDoctor) return;
    approveMutation.mutate({ id: selectedDoctor.id, status });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'REJECTED':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredDoctors = doctors?.filter((doctor: Doctor) => {
    if (statusFilter === 'ALL') return true;
    return doctor.status === statusFilter;
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
        <Typography variant="h4">Doctors / Clients</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          Add Doctor
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search doctors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="ALL">All</MenuItem>
                  <MenuItem value="APPROVED">Approved</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="REJECTED">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Doctors Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Specialization</TableCell>
              <TableCell>Clinic/Hospital</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDoctors?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="textSecondary">No doctors found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredDoctors?.map((doctor: Doctor) => (
                <TableRow key={doctor.id}>
                  <TableCell>
                    <Typography variant="body1" fontWeight="medium">
                      {doctor.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{doctor.specialization || '-'}</TableCell>
                  <TableCell>{doctor.clinicName || '-'}</TableCell>
                  <TableCell>
                    {doctor.city && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2">
                          {doctor.city}
                          {doctor.state && `, ${doctor.state}`}
                        </Typography>
                      </Box>
                    )}
                    {!doctor.city && '-'}
                  </TableCell>
                  <TableCell>
                    <Box>
                      {doctor.phone && (
                        <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                          <Phone fontSize="small" />
                          <Typography variant="body2">{doctor.phone}</Typography>
                        </Box>
                      )}
                      {doctor.email && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Email fontSize="small" />
                          <Typography variant="body2">{doctor.email}</Typography>
                        </Box>
                      )}
                      {!doctor.phone && !doctor.email && '-'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={doctor.status}
                      color={getStatusColor(doctor.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      {isManager && doctor.status === 'PENDING' && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => {
                                setSelectedDoctor(doctor);
                                setApproveDialog(true);
                              }}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleApprove('REJECTED')}
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {isManager && (
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEdit(doctor)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Doctor Dialog */}
      <Dialog open={open} onClose={() => { setOpen(false); setEditingDoctor(null); }} maxWidth="md" fullWidth>
        <DialogTitle>{editingDoctor ? 'Edit Doctor' : 'Add Doctor'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Doctor Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Specialization"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Clinic/Hospital Name"
                value={formData.clinicName}
                onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="GP, Specialist, etc."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Pincode"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Latitude"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                helperText="GPS coordinates for location validation"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Longitude"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                helperText="GPS coordinates for location validation"
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
            {!isManager && (
              <Grid item xs={12}>
                <Alert severity="info">
                  Your doctor proposal will be sent for approval
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpen(false); setEditingDoctor(null); }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {(createMutation.isPending || updateMutation.isPending) ? (
              <CircularProgress size={20} />
            ) : (
              editingDoctor ? 'Update' : 'Create'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialog} onClose={() => setApproveDialog(false)}>
        <DialogTitle>Approve Doctor</DialogTitle>
        <DialogContent>
          {selectedDoctor && (
            <Typography>
              Are you sure you want to approve <strong>{selectedDoctor.name}</strong>?
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => handleApprove('APPROVED')}
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? <CircularProgress size={20} /> : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
