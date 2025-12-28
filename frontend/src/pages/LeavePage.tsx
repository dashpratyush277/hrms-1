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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Alert,
  Checkbox,
  FormControlLabel,
  Stack,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Cancel,
  Edit,
  Delete,
  CalendarToday,
  Visibility,
  FilterList,
} from '@mui/icons-material';
import api from '../lib/api';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';

interface LeaveApplication {
  id: string;
  leaveType: { id: string; name: string; code: string };
  startDate: string;
  endDate: string;
  days: number;
  isHalfDay: boolean;
  halfDayType?: string;
  reason: string;
  attachments?: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  appliedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  comments?: string;
  currentApprover?: { firstName: string; lastName: string; employeeId: string };
  employee: { firstName: string; lastName: string; employeeId: string };
  approvalHistory?: Array<{
    id: string;
    action: string;
    status: string;
    comments?: string;
    approver: { firstName: string; lastName: string };
    createdAt: string;
  }>;
}

interface LeaveBalance {
  id: string;
  leaveType: { id: string; name: string; code: string };
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  carryForward: number;
  availableDays: number;
  year: number;
}

interface LeaveType {
  id: string;
  name: string;
  code: string;
  maxDays?: number;
  halfDayAllowed: boolean;
  attachmentRequired: boolean;
  isActive: boolean;
}

export function LeavePage() {
  const [open, setOpen] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [approveDialog, setApproveDialog] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<LeaveApplication | null>(null);
  const [tab, setTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER' || user?.role === 'HR_ADMIN' || user?.role === 'TENANT_ADMIN';

  // Form state
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    isHalfDay: false,
    halfDayType: 'FIRST_HALF',
    reason: '',
    attachments: [] as string[],
  });

  // Fetch leave types
  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const res = await api.get('/leave/types');
      return res.data.filter((lt: LeaveType) => lt.isActive);
    },
  });

  // Fetch leave applications
  const { data: applications, isLoading } = useQuery({
    queryKey: ['leave-applications', statusFilter, startDateFilter, endDateFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (startDateFilter) params.startDate = startDateFilter;
      if (endDateFilter) params.endDate = endDateFilter;

      if (isManager && tab === 1) {
        // Team leaves
        const res = await api.get('/leave/team', { params });
        return res.data;
      } else {
        const res = await api.get('/leave', { params });
        return res.data;
      }
    },
  });

  // Fetch leave balances
  const { data: balances } = useQuery({
    queryKey: ['leave-balances'],
    queryFn: async () => {
      const res = await api.get('/leave/balances');
      return res.data;
    },
    retry: false,
  });

  // Apply leave mutation
  const applyMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/leave/apply', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Leave application submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['leave-applications'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      setOpen(false);
      setFormData({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        isHalfDay: false,
        halfDayType: 'FIRST_HALF',
        reason: '',
        attachments: [],
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to submit leave application');
    },
  });

  // Approve/Reject mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, status, comments, rejectionReason }: any) => {
      const res = await api.patch(`/leave/${id}/approve`, { status, comments, rejectionReason });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Leave application processed successfully');
      queryClient.invalidateQueries({ queryKey: ['leave-applications'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      setApproveDialog(false);
      setSelectedApplication(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process leave application');
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.delete(`/leave/${id}`, { data: { reason } });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Leave application cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['leave-applications'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel leave application');
    },
  });

  const handleSubmit = () => {
    if (!formData.leaveTypeId || !formData.startDate || !formData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.isHalfDay && !formData.halfDayType) {
      toast.error('Please select half-day type');
      return;
    }

    applyMutation.mutate({
      leaveTypeId: formData.leaveTypeId,
      startDate: formData.startDate,
      endDate: formData.isHalfDay ? formData.startDate : formData.endDate,
      isHalfDay: formData.isHalfDay,
      halfDayType: formData.isHalfDay ? formData.halfDayType : undefined,
      reason: formData.reason,
      attachments: formData.attachments,
    });
  };

  const handleApprove = (status: 'APPROVED' | 'REJECTED', comments?: string, rejectionReason?: string) => {
    if (!selectedApplication) return;
    approveMutation.mutate({
      id: selectedApplication.id,
      status,
      comments,
      rejectionReason,
    });
  };

  const handleCancel = (reason: string) => {
    if (!selectedApplication) return;
    cancelMutation.mutate({ id: selectedApplication.id, reason });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
        return 'default';
      default:
        return 'default';
    }
  };

  const filteredApplications = applications?.filter((app: LeaveApplication) => {
    if (tab === 0) return true; // All
    if (tab === 1) return app.status === 'PENDING'; // Pending
    if (tab === 2) return app.status === 'APPROVED'; // Approved
    return false;
  });

  const selectedLeaveType = leaveTypes?.find((lt: LeaveType) => lt.id === formData.leaveTypeId);

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
        <Typography variant="h4">Leave Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          Apply Leave
        </Button>
      </Box>

      {/* Leave Balances */}
      {balances && balances.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Leave Balances ({new Date().getFullYear()})
            </Typography>
            <Grid container spacing={2}>
              {balances.map((balance: LeaveBalance) => (
                <Grid item xs={12} sm={6} md={3} key={balance.id}>
                  <Box
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {balance.leaveType.name}
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {balance.availableDays.toFixed(1)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Total: {balance.totalDays} | Used: {balance.usedDays} | Pending: {balance.pendingDays}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="ALL">All</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="APPROVED">Approved</MenuItem>
                  <MenuItem value="REJECTED">Rejected</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setStatusFilter('ALL');
                  setStartDateFilter('');
                  setEndDateFilter('');
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="All Leaves" />
          <Tab label="Pending" />
          <Tab label="Approved" />
          {isManager && <Tab label="Team Leaves" />}
        </Tabs>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {isManager && tab === 3 && <TableCell>Employee</TableCell>}
                <TableCell>Leave Type</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Days</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredApplications?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isManager && tab === 3 ? 8 : 7} align="center">
                    <Typography color="textSecondary">No leave applications found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredApplications?.map((application: LeaveApplication) => (
                  <TableRow key={application.id}>
                    {isManager && tab === 3 && (
                      <TableCell>
                        {application.employee.firstName} {application.employee.lastName}
                      </TableCell>
                    )}
                    <TableCell>{application.leaveType.name}</TableCell>
                    <TableCell>{new Date(application.startDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(application.endDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {application.days}
                      {application.isHalfDay && ` (${application.halfDayType})`}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={application.status}
                        color={getStatusColor(application.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{application.reason}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedApplication(application);
                              setViewDialog(true);
                            }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {application.status === 'PENDING' && !isManager && (
                          <Tooltip title="Cancel">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                const reason = prompt('Please provide a reason for cancellation:');
                                if (reason) handleCancel(reason);
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {isManager && application.status === 'PENDING' && (
                          <>
                            <Tooltip title="Approve">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => {
                                  setSelectedApplication(application);
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
                                onClick={() => {
                                  const reason = prompt('Please provide a rejection reason:');
                                  if (reason) handleApprove('REJECTED', undefined, reason);
                                }}
                              >
                                <Cancel fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Apply Leave Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Apply for Leave</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Leave Type *</InputLabel>
                <Select
                  value={formData.leaveTypeId}
                  onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                  label="Leave Type *"
                >
                  {leaveTypes?.map((lt: LeaveType) => (
                    <MenuItem key={lt.id} value={lt.id}>
                      {lt.name} ({lt.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Start Date *"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="End Date *"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                disabled={formData.isHalfDay}
                inputProps={{ min: formData.startDate || new Date().toISOString().split('T')[0] }}
              />
            </Grid>
            {selectedLeaveType?.halfDayAllowed && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isHalfDay}
                      onChange={(e) => setFormData({ ...formData, isHalfDay: e.target.checked })}
                    />
                  }
                  label="Half Day"
                />
              </Grid>
            )}
            {formData.isHalfDay && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Half Day Type</InputLabel>
                  <Select
                    value={formData.halfDayType}
                    onChange={(e) => setFormData({ ...formData, halfDayType: e.target.value })}
                    label="Half Day Type"
                  >
                    <MenuItem value="FIRST_HALF">First Half</MenuItem>
                    <MenuItem value="SECOND_HALF">Second Half</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Reason *"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Please provide a reason for your leave application"
              />
            </Grid>
            {selectedLeaveType?.attachmentRequired && (
              <Grid item xs={12}>
                <Alert severity="info">Attachment is required for this leave type</Alert>
                <TextField
                  fullWidth
                  label="Attachment URLs (comma-separated)"
                  value={formData.attachments.join(', ')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      attachments: e.target.value.split(',').map((url) => url.trim()).filter(Boolean),
                    })
                  }
                  helperText="Enter URLs separated by commas"
                  sx={{ mt: 1 }}
                />
              </Grid>
            )}
            {formData.leaveTypeId && (
              <Grid item xs={12}>
                <Alert severity="info">
                  Available Balance:{' '}
                  {balances?.find((b: LeaveBalance) => b.leaveType.id === formData.leaveTypeId)
                    ?.availableDays || 0}{' '}
                  days
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={applyMutation.isPending}
          >
            {applyMutation.isPending ? <CircularProgress size={20} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Leave Application Details</DialogTitle>
        <DialogContent>
          {selectedApplication && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Leave Type
                  </Typography>
                  <Typography variant="body1">{selectedApplication.leaveType.name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedApplication.status}
                    color={getStatusColor(selectedApplication.status) as any}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Start Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedApplication.startDate).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    End Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedApplication.endDate).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="textSecondary">
                    Days
                  </Typography>
                  <Typography variant="body1">
                    {selectedApplication.days}
                    {selectedApplication.isHalfDay && ` (${selectedApplication.halfDayType})`}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    Reason
                  </Typography>
                  <Typography variant="body1">{selectedApplication.reason}</Typography>
                </Grid>
                {selectedApplication.attachments && selectedApplication.attachments.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">
                      Attachments
                    </Typography>
                    {selectedApplication.attachments.map((url, idx) => (
                      <Typography key={idx} variant="body2" component="a" href={url} target="_blank">
                        {url}
                      </Typography>
                    ))}
                  </Grid>
                )}
                {selectedApplication.approvalHistory && selectedApplication.approvalHistory.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Approval History
                    </Typography>
                    {selectedApplication.approvalHistory.map((history) => (
                      <Box key={history.id} sx={{ mb: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                        <Typography variant="caption">
                          {history.approver.firstName} {history.approver.lastName} - {history.action} -{' '}
                          {new Date(history.createdAt).toLocaleString()}
                        </Typography>
                        {history.comments && (
                          <Typography variant="body2">{history.comments}</Typography>
                        )}
                      </Box>
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

      {/* Approve Dialog */}
      <Dialog open={approveDialog} onClose={() => setApproveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve Leave Application</DialogTitle>
        <DialogContent>
          {selectedApplication && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Comments (Optional)"
                placeholder="Add any comments for the employee"
                onChange={(e) => {
                  if (selectedApplication) {
                    setSelectedApplication({ ...selectedApplication, comments: e.target.value });
                  }
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApproveDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => handleApprove('APPROVED', selectedApplication?.comments)}
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? <CircularProgress size={20} /> : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
