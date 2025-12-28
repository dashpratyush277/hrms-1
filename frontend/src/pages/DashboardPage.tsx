import { useQuery } from '@tanstack/react-query';
import { Grid, Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import {
  People,
  AccessTime,
  Event,
  AccountBalance,
  LocalHospital,
  LocationOn,
} from '@mui/icons-material';
import api from '../lib/api';

const StatCard = ({ title, value, icon, color }: any) => (
  <Card>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h4">{value}</Typography>
        </Box>
        <Box sx={{ color, fontSize: 40 }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

export function DashboardPage() {
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await api.get('/employees?limit=1');
      return res.data;
    },
  });

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const res = await api.get('/attendance?limit=1');
      return res.data;
    },
  });

  const { data: doctors, isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const res = await api.get('/doctors');
      return res.data;
    },
  });

  if (employeesLoading || attendanceLoading || doctorsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Employees"
            value={employees?.total || 0}
            icon={<People />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Today's Attendance"
            value={attendance?.data?.length || 0}
            icon={<AccessTime />}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Doctors"
            value={doctors?.length || 0}
            icon={<LocalHospital />}
            color="info.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Visits Today"
            value="0"
            icon={<LocationOn />}
            color="warning.main"
          />
        </Grid>
      </Grid>
    </Box>
  );
}

