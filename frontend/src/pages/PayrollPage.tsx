import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import api from '../lib/api';

export function PayrollPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['payslips'],
    queryFn: async () => {
      const res = await api.get('/payroll/payslips');
      return res.data;
    },
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
      <Typography variant="h4" gutterBottom>
        Payroll
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Month/Year</TableCell>
              <TableCell>Gross Salary</TableCell>
              <TableCell>Deductions</TableCell>
              <TableCell>Net Salary</TableCell>
              <TableCell>Days Worked</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.map((payslip: any) => (
              <TableRow key={payslip.id}>
                <TableCell>{`${payslip.month}/${payslip.year}`}</TableCell>
                <TableCell>₹{payslip.grossSalary.toFixed(2)}</TableCell>
                <TableCell>
                  ₹
                  {(
                    payslip.providentFund +
                    payslip.professionalTax +
                    payslip.incomeTax +
                    payslip.otherDeductions
                  ).toFixed(2)}
                </TableCell>
                <TableCell>₹{payslip.netSalary.toFixed(2)}</TableCell>
                <TableCell>{payslip.daysPresent}</TableCell>
                <TableCell>
                  {payslip.pdfUrl && (
                    <a href={payslip.pdfUrl} target="_blank" rel="noopener noreferrer">
                      Download
                    </a>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

