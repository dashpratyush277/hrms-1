import { useState, useEffect } from 'react';
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
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  LocationOn,
  AccessTime,
  Visibility,
  FilterList,
} from '@mui/icons-material';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';

interface Visit {
  id: string;
  doctor: { id: string; name: string; clinicName?: string };
  visitDate: string;
  startTime: string;
  endTime?: string;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  startAddress?: string;
  endAddress?: string;
  duration?: number;
  notes?: string;
  attachments?: string[];
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  employee: { firstName: string; lastName: string; employeeId: string };
}

export function VisitsPage() {
  const [startDialog, setStartDialog] = useState(false);
  const [endDialog, setEndDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [startFormData, setStartFormData] = useState({
    doctorId: '',
    visitDate: new Date().toISOString().split('T')[0],
    startLat: '',
    startLng: '',
    startAddress: '',
    notes: '',
  });

  const [endFormData, setEndFormData] = useState({
    endLat: '',
    endLng: '',
    endAddress: '',
    notes: '',
    attachments: [] as string[],
  });

  // Get current GPS location
  const getCurrentLocation = () => {
    return new Promise<{ lat: number; lng: number; address?: string }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Try to get address from coordinates (optional)
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
            );
            const data = await response.json();
            resolve({
              lat,
              lng,
              address: data.display_name || `${lat}, ${lng}`,
            });
          } catch {
            resolve({ lat, lng, address: `${lat}, ${lng}` });
          }
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // Fetch visits
  const { data: visits, isLoading } = useQuery({
    queryKey: ['visits', statusFilter, dateFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (dateFilter) params.startDate = dateFilter;
      const res = await api.get('/visits', { params });
      return res.data;
    },
  });

  // Fetch active visit
  const { data: activeVisitData } = useQuery({
    queryKey: ['active-visit'],
    queryFn: async () => {
      const res = await api.get('/visits', { params: { status: 'IN_PROGRESS' } });
      const active = res.data.find((v: Visit) => v.status === 'IN_PROGRESS');
      if (active) setActiveVisit(active);
      return active;
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Fetch doctors for dropdown
  const { data: doctors } = useQuery({
    queryKey: ['doctors-approved'],
    queryFn: async () => {
      const res = await api.get('/doctors', { params: { status: 'APPROVED' } });
      return res.data;
    },
  });

  const startVisitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/visits/start', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Visit started successfully');
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['active-visit'] });
      setStartDialog(false);
      setStartFormData({
        doctorId: '',
        visitDate: new Date().toISOString().split('T')[0],
        startLat: '',
        startLng: '',
        startAddress: '',
        notes: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to start visit');
    },
  });

  const endVisitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.post(`/visits/${id}/end`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Visit ended successfully');
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      queryClient.invalidateQueries({ queryKey: ['active-visit'] });
      setEndDialog(false);
      setActiveVisit(null);
      setEndFormData({
        endLat: '',
        endLng: '',
        endAddress: '',
        notes: '',
        attachments: [],
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to end visit');
    },
  });

  const handleStartVisit = async () => {
    if (!startFormData.doctorId) {
      toast.error('Please select a doctor');
      return;
    }

    try {
      // Get GPS location
      const location = await getCurrentLocation();
      const data = {
        ...startFormData,
        startLat: location.lat,
        startLng: location.lng,
        startAddress: location.address || startFormData.startAddress,
      };

      startVisitMutation.mutate(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to get GPS location. Please enable location services.');
    }
  };

  const handleEndVisit = async () => {
    if (!activeVisit) return;

    try {
      // Get GPS location
      const location = await getCurrentLocation();
      const data = {
        ...endFormData,
        endLat: location.lat,
        endLng: location.lng,
        endAddress: location.address || endFormData.endAddress,
      };

      endVisitMutation.mutate({ id: activeVisit.id, data });
    } catch (error: any) {
      toast.error(error.message || 'Failed to get GPS location. Please enable location services.');
    }
  };

  const filteredVisits = visits?.filter((visit: Visit) => {
    if (statusFilter === 'ALL') return true;
    return visit.status === statusFilter;
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
        <Typography variant="h4">Visits</Typography>
        {!activeVisit && (
          <Button
            variant="contained"
            color="success"
            startIcon={<PlayArrow />}
            onClick={() => setStartDialog(true)}
          >
            Start Visit
          </Button>
        )}
        {activeVisit && (
          <Button
            variant="contained"
            color="error"
            startIcon={<Stop />}
            onClick={() => setEndDialog(true)}
          >
            End Active Visit
          </Button>
        )}
      </Box>

      {/* Active Visit Card */}
      {activeVisit && (
        <Card sx={{ mb: 3, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6">Active Visit</Typography>
                <Typography variant="body2">
                  Doctor: {activeVisit.doctor.name}
                </Typography>
                <Typography variant="body2">
                  Started: {new Date(activeVisit.startTime).toLocaleString()}
                </Typography>
                {activeVisit.startAddress && (
                  <Typography variant="body2">
                    <LocationOn fontSize="small" /> {activeVisit.startAddress}
                  </Typography>
                )}
              </Box>
              <Button
                variant="contained"
                color="error"
                onClick={() => setEndDialog(true)}
              >
                End Visit
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

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
                  <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                  <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
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
                  setStatusFilter('ALL');
                  setDateFilter('');
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Visits Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Doctor</TableCell>
              <TableCell>Start Time</TableCell>
              <TableCell>End Time</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredVisits?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="textSecondary">No visits found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredVisits?.map((visit: Visit) => (
                <TableRow key={visit.id}>
                  <TableCell>{new Date(visit.visitDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {visit.doctor.name}
                    </Typography>
                    {visit.doctor.clinicName && (
                      <Typography variant="caption" color="textSecondary">
                        {visit.doctor.clinicName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {visit.startTime ? (
                      <Box>
                        <Typography variant="body2">
                          {new Date(visit.startTime).toLocaleTimeString()}
                        </Typography>
                        {visit.startAddress && (
                          <Typography variant="caption" color="textSecondary">
                            <LocationOn fontSize="small" /> {visit.startAddress.substring(0, 30)}...
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {visit.endTime ? (
                      <Box>
                        <Typography variant="body2">
                          {new Date(visit.endTime).toLocaleTimeString()}
                        </Typography>
                        {visit.endAddress && (
                          <Typography variant="caption" color="textSecondary">
                            <LocationOn fontSize="small" /> {visit.endAddress.substring(0, 30)}...
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {visit.duration ? (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <AccessTime fontSize="small" />
                        <Typography variant="body2">{visit.duration} min</Typography>
                      </Box>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {visit.startLat && visit.startLng ? (
                      <Tooltip title={`${visit.startLat}, ${visit.startLng}`}>
                        <Chip icon={<LocationOn />} label="GPS" size="small" />
                      </Tooltip>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={visit.status}
                      color={
                        visit.status === 'COMPLETED'
                          ? 'success'
                          : visit.status === 'IN_PROGRESS'
                          ? 'warning'
                          : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedVisit(visit);
                          setViewDialog(true);
                        }}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Start Visit Dialog */}
      <Dialog open={startDialog} onClose={() => setStartDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start Visit</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Doctor *</InputLabel>
                <Select
                  value={startFormData.doctorId}
                  onChange={(e) => setStartFormData({ ...startFormData, doctorId: e.target.value })}
                  label="Doctor *"
                >
                  {doctors?.map((doctor: any) => (
                    <MenuItem key={doctor.id} value={doctor.id}>
                      {doctor.name} {doctor.clinicName && `- ${doctor.clinicName}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Visit Date *"
                value={startFormData.visitDate}
                onChange={(e) => setStartFormData({ ...startFormData, visitDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={startFormData.notes}
                onChange={(e) => setStartFormData({ ...startFormData, notes: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                GPS location will be captured automatically when you start the visit
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStartDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleStartVisit}
            disabled={startVisitMutation.isPending}
          >
            {startVisitMutation.isPending ? (
              <CircularProgress size={20} />
            ) : (
              'Start Visit'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* End Visit Dialog */}
      <Dialog open={endDialog} onClose={() => setEndDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>End Visit</DialogTitle>
        <DialogContent>
          {activeVisit && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Doctor: {activeVisit.doctor.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Started: {new Date(activeVisit.startTime).toLocaleString()}
              </Typography>
            </Box>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Visit Notes"
                value={endFormData.notes}
                onChange={(e) => setEndFormData({ ...endFormData, notes: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Attachment URLs (comma-separated)"
                value={endFormData.attachments.join(', ')}
                onChange={(e) =>
                  setEndFormData({
                    ...endFormData,
                    attachments: e.target.value.split(',').map((url) => url.trim()).filter(Boolean),
                  })
                }
                helperText="Enter URLs separated by commas"
              />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info">
                GPS location will be captured automatically when you end the visit
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEndDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleEndVisit}
            disabled={endVisitMutation.isPending}
          >
            {endVisitMutation.isPending ? <CircularProgress size={20} /> : 'End Visit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Visit Details Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Visit Details</DialogTitle>
        <DialogContent>
          {selectedVisit && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Doctor
                  </Typography>
                  <Typography variant="body1">{selectedVisit.doctor.name}</Typography>
                  {selectedVisit.doctor.clinicName && (
                    <Typography variant="body2" color="textSecondary">
                      {selectedVisit.doctor.clinicName}
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedVisit.status}
                    color={
                      selectedVisit.status === 'COMPLETED'
                        ? 'success'
                        : selectedVisit.status === 'IN_PROGRESS'
                        ? 'warning'
                        : 'default'
                    }
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Visit Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedVisit.visitDate).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Duration
                  </Typography>
                  <Typography variant="body1">
                    {selectedVisit.duration ? `${selectedVisit.duration} minutes` : '-'}
                  </Typography>
                </Grid>
                {selectedVisit.startTime && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      Start Time
                    </Typography>
                    <Typography variant="body1">
                      {new Date(selectedVisit.startTime).toLocaleString()}
                    </Typography>
                    {selectedVisit.startAddress && (
                      <Typography variant="caption" color="textSecondary">
                        <LocationOn fontSize="small" /> {selectedVisit.startAddress}
                      </Typography>
                    )}
                    {selectedVisit.startLat && selectedVisit.startLng && (
                      <Typography variant="caption" color="textSecondary">
                        GPS: {selectedVisit.startLat.toFixed(6)}, {selectedVisit.startLng.toFixed(6)}
                      </Typography>
                    )}
                  </Grid>
                )}
                {selectedVisit.endTime && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">
                      End Time
                    </Typography>
                    <Typography variant="body1">
                      {new Date(selectedVisit.endTime).toLocaleString()}
                    </Typography>
                    {selectedVisit.endAddress && (
                      <Typography variant="caption" color="textSecondary">
                        <LocationOn fontSize="small" /> {selectedVisit.endAddress}
                      </Typography>
                    )}
                    {selectedVisit.endLat && selectedVisit.endLng && (
                      <Typography variant="caption" color="textSecondary">
                        GPS: {selectedVisit.endLat.toFixed(6)}, {selectedVisit.endLng.toFixed(6)}
                      </Typography>
                    )}
                  </Grid>
                )}
                {selectedVisit.notes && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">
                      Notes
                    </Typography>
                    <Typography variant="body1">{selectedVisit.notes}</Typography>
                  </Grid>
                )}
                {selectedVisit.attachments && selectedVisit.attachments.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">
                      Attachments
                    </Typography>
                    {selectedVisit.attachments.map((url, idx) => (
                      <Typography key={idx} variant="body2" component="a" href={url} target="_blank">
                        {url}
                      </Typography>
                    ))}
                  </Grid>
                )}
              </Grid>
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
