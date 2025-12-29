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
  Checkbox,
  FormControlLabel,
  Switch,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Settings,
} from '@mui/icons-material';
import api from '../lib/api';
import { toast } from 'react-toastify';

interface LeaveType {
  id: string;
  name: string;
  code: string;
  maxDays?: number;
  carryForward: boolean;
  carryForwardLimit?: number;
  requiresApproval: boolean;
  isPaid: boolean;
  halfDayAllowed: boolean;
  attachmentRequired: boolean;
  maxDaysPerRequest?: number;
  genderEligibility: string;
  locationEligibility: string[];
  gradeEligibility: string[];
  isActive: boolean;
}

interface LeavePolicy {
  id: string;
  leaveType: { id: string; name: string };
  name: string;
  accrualType: string;
  accrualDays: number;
  accrualPeriod: number;
  proratedForJoiners: boolean;
  carryForwardEnabled: boolean;
  carryForwardLimit?: number;
  encashmentEnabled: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  isDefault: boolean;
}

export function LeaveConfigPage() {
  const [tab, setTab] = useState(0);
  const [typeDialog, setTypeDialog] = useState(false);
  const [policyDialog, setPolicyDialog] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
  const queryClient = useQueryClient();

  const [typeFormData, setTypeFormData] = useState({
    name: '',
    code: '',
    maxDays: '',
    carryForward: false,
    carryForwardLimit: '',
    requiresApproval: true,
    isPaid: true,
    halfDayAllowed: false,
    attachmentRequired: false,
    maxDaysPerRequest: '',
    genderEligibility: 'ALL',
    locationEligibility: '',
    gradeEligibility: '',
    isActive: true,
  });

  const [policyFormData, setPolicyFormData] = useState({
    leaveTypeId: '',
    name: '',
    accrualType: 'ANNUAL',
    accrualDays: '',
    accrualPeriod: '12',
    proratedForJoiners: true,
    carryForwardEnabled: false,
    carryForwardLimit: '',
    encashmentEnabled: false,
    effectiveFrom: '',
    effectiveTo: '',
    isDefault: false,
  });

  // Fetch leave types
  const { data: leaveTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const res = await api.get('/leave/types');
      return res.data;
    },
  });

  // Fetch leave policies
  const { data: policies, isLoading: policiesLoading } = useQuery({
    queryKey: ['leave-policies'],
    queryFn: async () => {
      const res = await api.get('/leave/policies');
      return res.data;
    },
  });

  // Create/Update leave type mutation
  const typeMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingType) {
        const res = await api.patch(`/leave/types/${editingType.id}`, data);
        return res.data;
      } else {
        const res = await api.post('/leave/types', data);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(`Leave type ${editingType ? 'updated' : 'created'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
      setTypeDialog(false);
      setEditingType(null);
      setTypeFormData({
        name: '',
        code: '',
        maxDays: '',
        carryForward: false,
        carryForwardLimit: '',
        requiresApproval: true,
        isPaid: true,
        halfDayAllowed: false,
        attachmentRequired: false,
        maxDaysPerRequest: '',
        genderEligibility: 'ALL',
        locationEligibility: '',
        gradeEligibility: '',
        isActive: true,
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save leave type');
    },
  });

  // Create/Update leave policy mutation
  const policyMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingPolicy) {
        const res = await api.patch(`/leave/policies/${editingPolicy.id}`, data);
        return res.data;
      } else {
        const res = await api.post('/leave/policies', data);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success(`Leave policy ${editingPolicy ? 'updated' : 'created'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['leave-policies'] });
      setPolicyDialog(false);
      setEditingPolicy(null);
      setPolicyFormData({
        leaveTypeId: '',
        name: '',
        accrualType: 'ANNUAL',
        accrualDays: '',
        accrualPeriod: '12',
        proratedForJoiners: true,
        carryForwardEnabled: false,
        carryForwardLimit: '',
        encashmentEnabled: false,
        effectiveFrom: '',
        effectiveTo: '',
        isDefault: false,
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save leave policy');
    },
  });

  // Delete leave type mutation
  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/leave/types/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Leave type deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete leave type');
    },
  });

  const handleEditType = (type: LeaveType) => {
    setEditingType(type);
    setTypeFormData({
      name: type.name,
      code: type.code,
      maxDays: type.maxDays?.toString() || '',
      carryForward: type.carryForward,
      carryForwardLimit: type.carryForwardLimit?.toString() || '',
      requiresApproval: type.requiresApproval,
      isPaid: type.isPaid,
      halfDayAllowed: type.halfDayAllowed,
      attachmentRequired: type.attachmentRequired,
      maxDaysPerRequest: type.maxDaysPerRequest?.toString() || '',
      genderEligibility: type.genderEligibility,
      locationEligibility: type.locationEligibility.join(', '),
      gradeEligibility: type.gradeEligibility.join(', '),
      isActive: type.isActive,
    });
    setTypeDialog(true);
  };

  const handleEditPolicy = (policy: LeavePolicy) => {
    setEditingPolicy(policy);
    setPolicyFormData({
      leaveTypeId: policy.leaveType.id,
      name: policy.name,
      accrualType: policy.accrualType,
      accrualDays: policy.accrualDays.toString(),
      accrualPeriod: policy.accrualPeriod.toString(),
      proratedForJoiners: policy.proratedForJoiners,
      carryForwardEnabled: policy.carryForwardEnabled,
      carryForwardLimit: policy.carryForwardLimit?.toString() || '',
      encashmentEnabled: policy.encashmentEnabled,
      effectiveFrom: policy.effectiveFrom.split('T')[0],
      effectiveTo: policy.effectiveTo?.split('T')[0] || '',
      isDefault: policy.isDefault,
    });
    setPolicyDialog(true);
  };

  const handleSubmitType = () => {
    if (!typeFormData.name || !typeFormData.code) {
      toast.error('Please fill in all required fields');
      return;
    }

    const data: any = {
      ...typeFormData,
      maxDays: typeFormData.maxDays ? parseInt(typeFormData.maxDays) : undefined,
      carryForwardLimit: typeFormData.carryForwardLimit ? parseFloat(typeFormData.carryForwardLimit) : undefined,
      maxDaysPerRequest: typeFormData.maxDaysPerRequest ? parseInt(typeFormData.maxDaysPerRequest) : undefined,
      locationEligibility: typeFormData.locationEligibility
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      gradeEligibility: typeFormData.gradeEligibility
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    typeMutation.mutate(data);
  };

  const handleSubmitPolicy = () => {
    if (!policyFormData.leaveTypeId || !policyFormData.name || !policyFormData.accrualDays || !policyFormData.effectiveFrom) {
      toast.error('Please fill in all required fields');
      return;
    }

    const data: any = {
      ...policyFormData,
      accrualDays: parseFloat(policyFormData.accrualDays),
      accrualPeriod: parseInt(policyFormData.accrualPeriod),
      carryForwardLimit: policyFormData.carryForwardLimit ? parseFloat(policyFormData.carryForwardLimit) : undefined,
      effectiveTo: policyFormData.effectiveTo || undefined,
    };

    policyMutation.mutate(data);
  };

  if (typesLoading || policiesLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Leave Configuration</Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Leave Types" />
        <Tab label="Leave Policies" />
      </Tabs>

      {/* Leave Types Tab */}
      {tab === 0 && (
        <Card>
          <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
            <Typography variant="h6">Leave Types</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setTypeDialog(true)}>
              Add Leave Type
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Max Days</TableCell>
                  <TableCell>Half Day</TableCell>
                  <TableCell>Attachment Required</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaveTypes?.map((type: LeaveType) => (
                  <TableRow key={type.id}>
                    <TableCell>{type.code}</TableCell>
                    <TableCell>{type.name}</TableCell>
                    <TableCell>{type.maxDays || 'Unlimited'}</TableCell>
                    <TableCell>
                      <Chip label={type.halfDayAllowed ? 'Yes' : 'No'} size="small" color={type.halfDayAllowed ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell>
                      <Chip label={type.attachmentRequired ? 'Yes' : 'No'} size="small" color={type.attachmentRequired ? 'warning' : 'default'} />
                    </TableCell>
                    <TableCell>
                      <Chip label={type.isActive ? 'Active' : 'Inactive'} size="small" color={type.isActive ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEditType(type)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this leave type?')) {
                              deleteTypeMutation.mutate(type.id);
                            }
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Leave Policies Tab */}
      {tab === 1 && (
        <Card>
          <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
            <Typography variant="h6">Leave Policies</Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setPolicyDialog(true)}>
              Add Leave Policy
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Leave Type</TableCell>
                  <TableCell>Policy Name</TableCell>
                  <TableCell>Accrual Type</TableCell>
                  <TableCell>Accrual Days</TableCell>
                  <TableCell>Effective From</TableCell>
                  <TableCell>Default</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {policies?.map((policy: LeavePolicy) => (
                  <TableRow key={policy.id}>
                    <TableCell>{policy.leaveType.name}</TableCell>
                    <TableCell>{policy.name}</TableCell>
                    <TableCell>{policy.accrualType}</TableCell>
                    <TableCell>{policy.accrualDays}</TableCell>
                    <TableCell>{new Date(policy.effectiveFrom).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip label={policy.isDefault ? 'Yes' : 'No'} size="small" color={policy.isDefault ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEditPolicy(policy)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Leave Type Dialog */}
      <Dialog open={typeDialog} onClose={() => { setTypeDialog(false); setEditingType(null); }} maxWidth="md" fullWidth>
        <DialogTitle>{editingType ? 'Edit Leave Type' : 'Add Leave Type'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name *"
                value={typeFormData.name}
                onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Code *"
                value={typeFormData.code}
                onChange={(e) => setTypeFormData({ ...typeFormData, code: e.target.value.toUpperCase() })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Days"
                value={typeFormData.maxDays}
                onChange={(e) => setTypeFormData({ ...typeFormData, maxDays: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Days Per Request"
                value={typeFormData.maxDaysPerRequest}
                onChange={(e) => setTypeFormData({ ...typeFormData, maxDaysPerRequest: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={typeFormData.carryForward}
                    onChange={(e) => setTypeFormData({ ...typeFormData, carryForward: e.target.checked })}
                  />
                }
                label="Allow Carry Forward"
              />
            </Grid>
            {typeFormData.carryForward && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Carry Forward Limit"
                  value={typeFormData.carryForwardLimit}
                  onChange={(e) => setTypeFormData({ ...typeFormData, carryForwardLimit: e.target.value })}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={typeFormData.requiresApproval}
                    onChange={(e) => setTypeFormData({ ...typeFormData, requiresApproval: e.target.checked })}
                  />
                }
                label="Requires Approval"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={typeFormData.isPaid}
                    onChange={(e) => setTypeFormData({ ...typeFormData, isPaid: e.target.checked })}
                  />
                }
                label="Paid Leave"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={typeFormData.halfDayAllowed}
                    onChange={(e) => setTypeFormData({ ...typeFormData, halfDayAllowed: e.target.checked })}
                  />
                }
                label="Half Day Allowed"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={typeFormData.attachmentRequired}
                    onChange={(e) => setTypeFormData({ ...typeFormData, attachmentRequired: e.target.checked })}
                  />
                }
                label="Attachment Required"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Gender Eligibility</InputLabel>
                <Select
                  value={typeFormData.genderEligibility}
                  onChange={(e) => setTypeFormData({ ...typeFormData, genderEligibility: e.target.value })}
                  label="Gender Eligibility"
                >
                  <MenuItem value="ALL">All</MenuItem>
                  <MenuItem value="MALE">Male</MenuItem>
                  <MenuItem value="FEMALE">Female</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={typeFormData.isActive}
                    onChange={(e) => setTypeFormData({ ...typeFormData, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setTypeDialog(false); setEditingType(null); }}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitType} disabled={typeMutation.isPending}>
            {typeMutation.isPending ? <CircularProgress size={20} /> : editingType ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Leave Policy Dialog */}
      <Dialog open={policyDialog} onClose={() => { setPolicyDialog(false); setEditingPolicy(null); }} maxWidth="md" fullWidth>
        <DialogTitle>{editingPolicy ? 'Edit Leave Policy' : 'Add Leave Policy'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Leave Type *</InputLabel>
                <Select
                  value={policyFormData.leaveTypeId}
                  onChange={(e) => setPolicyFormData({ ...policyFormData, leaveTypeId: e.target.value })}
                  label="Leave Type *"
                >
                  {leaveTypes?.filter((lt: LeaveType) => lt.isActive).map((lt: LeaveType) => (
                    <MenuItem key={lt.id} value={lt.id}>
                      {lt.name} ({lt.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Policy Name *"
                value={policyFormData.name}
                onChange={(e) => setPolicyFormData({ ...policyFormData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Accrual Type *</InputLabel>
                <Select
                  value={policyFormData.accrualType}
                  onChange={(e) => setPolicyFormData({ ...policyFormData, accrualType: e.target.value })}
                  label="Accrual Type *"
                >
                  <MenuItem value="ANNUAL">Annual</MenuItem>
                  <MenuItem value="MONTHLY">Monthly</MenuItem>
                  <MenuItem value="PRORATED">Prorated</MenuItem>
                  <MenuItem value="NONE">None</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Accrual Days *"
                value={policyFormData.accrualDays}
                onChange={(e) => setPolicyFormData({ ...policyFormData, accrualDays: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Accrual Period (Months)"
                value={policyFormData.accrualPeriod}
                onChange={(e) => setPolicyFormData({ ...policyFormData, accrualPeriod: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Effective From *"
                value={policyFormData.effectiveFrom}
                onChange={(e) => setPolicyFormData({ ...policyFormData, effectiveFrom: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Effective To"
                value={policyFormData.effectiveTo}
                onChange={(e) => setPolicyFormData({ ...policyFormData, effectiveTo: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={policyFormData.proratedForJoiners}
                    onChange={(e) => setPolicyFormData({ ...policyFormData, proratedForJoiners: e.target.checked })}
                  />
                }
                label="Prorated for Joiners"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={policyFormData.carryForwardEnabled}
                    onChange={(e) => setPolicyFormData({ ...policyFormData, carryForwardEnabled: e.target.checked })}
                  />
                }
                label="Carry Forward Enabled"
              />
            </Grid>
            {policyFormData.carryForwardEnabled && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Carry Forward Limit"
                  value={policyFormData.carryForwardLimit}
                  onChange={(e) => setPolicyFormData({ ...policyFormData, carryForwardLimit: e.target.value })}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={policyFormData.encashmentEnabled}
                    onChange={(e) => setPolicyFormData({ ...policyFormData, encashmentEnabled: e.target.checked })}
                  />
                }
                label="Encashment Enabled"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={policyFormData.isDefault}
                    onChange={(e) => setPolicyFormData({ ...policyFormData, isDefault: e.target.checked })}
                  />
                }
                label="Set as Default Policy"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setPolicyDialog(false); setEditingPolicy(null); }}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitPolicy} disabled={policyMutation.isPending}>
            {policyMutation.isPending ? <CircularProgress size={20} /> : editingPolicy ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

