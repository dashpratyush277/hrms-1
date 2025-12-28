import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import { LocationOn } from '@mui/icons-material';
import api from '../lib/api';
import { toast } from 'react-toastify';

export function AttendancePage() {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const res = await api.get('/attendance');
      return res.data;
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/attendance/check-in', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Checked in successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Check-in failed';
      toast.error(message);
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/attendance/check-out', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Checked out successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || 'Check-out failed';
      toast.error(message);
    },
  });

  const getLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const loc = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            setLatitude(loc.latitude);
            setLongitude(loc.longitude);
            resolve(loc);
          },
          (error) => {
            toast.error('Unable to get location. Please enable location permissions.');
            reject(error);
          }
        );
      } else {
        reject(new Error('Geolocation is not supported'));
      }
    });
  };

  const handleCheckIn = async () => {
    try {
      const location = await getLocation();
      checkInMutation.mutate({
        latitude: location.latitude,
        longitude: location.longitude,
        mode: 'OFFICE',
      });
    } catch (error) {
      // Location error already handled in getLocation
      // Still allow check-in without location if needed
      checkInMutation.mutate({
        mode: 'OFFICE',
      });
    }
  };

  const handleCheckOut = async () => {
    try {
      const location = await getLocation();
      checkOutMutation.mutate({
        latitude: location.latitude,
        longitude: location.longitude,
      });
    } catch (error) {
      // Location error already handled in getLocation
      // Still allow check-out without location if needed
      checkOutMutation.mutate({});
    }
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
      <Typography variant="h4" gutterBottom>
        Attendance
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<LocationOn />}
              onClick={handleCheckIn}
              disabled={checkInMutation.isPending}
            >
              Check In
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<LocationOn />}
              onClick={handleCheckOut}
              disabled={checkOutMutation.isPending}
            >
              Check Out
            </Button>
          </Box>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Check In</TableCell>
              <TableCell>Check Out</TableCell>
              <TableCell>Hours</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.map((attendance: any) => (
              <TableRow key={attendance.id}>
                <TableCell>{new Date(attendance.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  {attendance.checkInTime
                    ? new Date(attendance.checkInTime).toLocaleTimeString()
                    : '-'}
                </TableCell>
                <TableCell>
                  {attendance.checkOutTime
                    ? new Date(attendance.checkOutTime).toLocaleTimeString()
                    : '-'}
                </TableCell>
                <TableCell>{attendance.totalHours?.toFixed(2) || '-'}</TableCell>
                <TableCell>{attendance.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

