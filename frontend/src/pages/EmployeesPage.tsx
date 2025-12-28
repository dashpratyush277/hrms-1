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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import { Add, Edit, Delete, ExpandMore } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from 'react-toastify';

interface EmployeeFormData {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  dateOfJoining: string;
  pan: string;
  aadhaar: string;
  pfNumber: string;
  esiNumber: string;
  uan: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  location: string;
  bankAccountNumber: string;
  bankIFSC: string;
  bankName: string;
  emergencyContact: string;
  emergencyPhone: string;
  employmentType: string;
  isActive: boolean;
  departmentId: string;
  designation: string;
  reportingManagerId: string;
  password: string;
  userRole: string;
}

export function EmployeesPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState<Partial<EmployeeFormData>>({
    employmentType: 'FULL_TIME',
    isActive: true,
    userRole: 'EMPLOYEE',
  });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['employees', search],
    queryFn: async () => {
      const res = await api.get(`/employees?search=${search || ''}`);
      return res.data;
    },
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/employees/departments/list');
      return res.data;
    },
  });

  const { data: managers } = useQuery({
    queryKey: ['managers'],
    queryFn: async () => {
      const res = await api.get('/employees/managers/list');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<EmployeeFormData>) => {
      const res = await api.post('/employees', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Employee created successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setOpen(false);
      setFormData({ employmentType: 'FULL_TIME', isActive: true, userRole: 'EMPLOYEE' });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create employee');
    },
  });


  const handleChange = (field: keyof EmployeeFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // Basic validation
    if (!formData.employeeId || !formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.dateOfJoining) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Password validation (optional but if provided, must be at least 6 characters)
    if (formData.password && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    createMutation.mutate(formData);
  };

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
        <Typography variant="h4">Employees</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            variant="outlined"
            onClick={() => navigate('/departments')}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Department
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
            Add Employee
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((employee: any) => (
              <TableRow key={employee.id}>
                <TableCell>{employee.employeeId}</TableCell>
                <TableCell>{`${employee.firstName} ${employee.lastName}`}</TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>{employee.phone}</TableCell>
                <TableCell>{employee.department?.name || '-'}</TableCell>
                <TableCell>
                  <IconButton size="small">
                    <Edit />
                  </IconButton>
                  <IconButton size="small">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Add New Employee</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Personal Details */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Personal Details</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Employee ID *"
                      value={formData.employeeId || ''}
                      onChange={handleChange('employeeId')}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Date of Joining *"
                      type="date"
                      value={formData.dateOfJoining || ''}
                      onChange={handleChange('dateOfJoining')}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name *"
                      value={formData.firstName || ''}
                      onChange={handleChange('firstName')}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name *"
                      value={formData.lastName || ''}
                      onChange={handleChange('lastName')}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Date of Birth"
                      type="date"
                      value={formData.dateOfBirth || ''}
                      onChange={handleChange('dateOfBirth')}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Employment Type</InputLabel>
                      <Select
                        value={formData.employmentType || 'FULL_TIME'}
                        onChange={(e) => handleChange('employmentType')(e)}
                        label="Employment Type"
                      >
                        <MenuItem value="FULL_TIME">Full-Time</MenuItem>
                        <MenuItem value="PART_TIME">Part-Time</MenuItem>
                        <MenuItem value="INTERN">Intern</MenuItem>
                        <MenuItem value="CONSULTANT">Consultant</MenuItem>
                        <MenuItem value="CONTRACT">Contract</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.isActive ?? true}
                          onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                        />
                      }
                      label="Active"
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Contact Details */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Contact Details</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email *"
                      type="email"
                      value={formData.email || ''}
                      onChange={handleChange('email')}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone *"
                      value={formData.phone || ''}
                      onChange={handleChange('phone')}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Address"
                      multiline
                      rows={2}
                      value={formData.address || ''}
                      onChange={handleChange('address')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="City"
                      value={formData.city || ''}
                      onChange={handleChange('city')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="State"
                      value={formData.state || ''}
                      onChange={handleChange('state')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Pincode"
                      value={formData.pincode || ''}
                      onChange={handleChange('pincode')}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Employment Details */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Employment Details</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Department</InputLabel>
                      <Select
                        value={formData.departmentId || ''}
                        onChange={(e) => handleChange('departmentId')(e)}
                        label="Department"
                      >
                        {departments?.map((dept: any) => (
                          <MenuItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Designation"
                      value={formData.designation || ''}
                      onChange={handleChange('designation')}
                      placeholder="e.g., Software Engineer, Manager, etc."
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Location/Branch"
                      value={formData.location || ''}
                      onChange={handleChange('location')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Reporting Manager</InputLabel>
                      <Select
                        value={formData.reportingManagerId || ''}
                        onChange={(e) => handleChange('reportingManagerId')(e)}
                        label="Reporting Manager"
                      >
                        {managers?.map((mgr: any) => (
                          <MenuItem key={mgr.id} value={mgr.id}>
                            {mgr.firstName} {mgr.lastName} ({mgr.employeeId})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Statutory Fields */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Statutory Fields</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="PAN"
                      value={formData.pan || ''}
                      onChange={handleChange('pan')}
                      inputProps={{ maxLength: 10 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Aadhaar"
                      value={formData.aadhaar || ''}
                      onChange={handleChange('aadhaar')}
                      inputProps={{ maxLength: 12 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="PF Number"
                      value={formData.pfNumber || ''}
                      onChange={handleChange('pfNumber')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="ESI Number"
                      value={formData.esiNumber || ''}
                      onChange={handleChange('esiNumber')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="UAN (Universal Account Number)"
                      value={formData.uan || ''}
                      onChange={handleChange('uan')}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Bank Details */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Bank Details</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Bank Name"
                      value={formData.bankName || ''}
                      onChange={handleChange('bankName')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Account Number"
                      value={formData.bankAccountNumber || ''}
                      onChange={handleChange('bankAccountNumber')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="IFSC Code"
                      value={formData.bankIFSC || ''}
                      onChange={handleChange('bankIFSC')}
                      inputProps={{ maxLength: 11 }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Emergency Contact */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Emergency Contact</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Emergency Contact Name"
                      value={formData.emergencyContact || ''}
                      onChange={handleChange('emergencyContact')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Emergency Contact Phone"
                      value={formData.emergencyPhone || ''}
                      onChange={handleChange('emergencyPhone')}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Account Details */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography variant="h6">Account Details</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Password *"
                      type="password"
                      value={formData.password || ''}
                      onChange={handleChange('password')}
                      required
                      helperText="Password for login. If not provided, default password will be set."
                      inputProps={{ minLength: 6 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>User Role</InputLabel>
                      <Select
                        value={formData.userRole || 'EMPLOYEE'}
                        onChange={(e) => handleChange('userRole')(e)}
                        label="User Role"
                      >
                        <MenuItem value="EMPLOYEE">Employee</MenuItem>
                        <MenuItem value="MANAGER">Manager</MenuItem>
                        <MenuItem value="HR_ADMIN">HR Admin</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Login Email: {formData.email || 'Will use employee email'}
                    </Typography>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpen(false); setFormData({ employmentType: 'FULL_TIME', isActive: true }); }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <CircularProgress size={24} /> : 'Create Employee'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

