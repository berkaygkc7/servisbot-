const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://wlbpbmkfsqpxgwvzigaq.supabase.co', 'sb_publishable_tAiWjMUbZ9ozaKkQHZDjew_hVtpD70W');

async function updateDebts() {
  const { data: students, error: sErr } = await supabase.from('students').select('*');
  const { data: rules, error: rErr } = await supabase.from('pricing_rules').select('*');
  const { data: payments, error: pErr } = await supabase.from('payments').select('*');

  if (sErr || rErr || pErr) {
    console.error("Error fetching data", sErr, rErr, pErr);
    return;
  }

  let updateCount = 0;

  for (const student of students) {
    if (!student.neighborhood) continue;

    const normNbr = student.neighborhood.toLocaleLowerCase('tr-TR').trim();
    const rule = rules.find(r => r.school_id === student.school_id && r.school_level?.toLocaleLowerCase('tr-TR').trim() === normNbr);

    if (rule && rule.annual_amount) {
      const annualPrice = Number(rule.annual_amount);

      // Sum of payments
      const studentPayments = payments.filter(p => p.student_id === student.id && (p.status === 'approved' || p.status === 'completed' || !p.status));
      const totalPaid = studentPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      
      const newDebt = Math.max(0, annualPrice - totalPaid);
      
      if (Number(student.total_debt) !== newDebt) {
          console.log(`Updating student ${student.full_name || student.name} (${student.neighborhood}): Old Debt=${student.total_debt}, New Debt=${newDebt}, Total Paid=${totalPaid}`);
          await supabase.from('students').update({ total_debt: newDebt }).eq('id', student.id);
          updateCount++;
      }
    }
  }
  console.log(`Done. Updated ${updateCount} students.`);
}

updateDebts();
