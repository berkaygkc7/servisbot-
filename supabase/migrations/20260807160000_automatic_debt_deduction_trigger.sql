-- Trigger function to automatically update student's total_debt when payment status changes to/from 'Ödendi'

CREATE OR REPLACE FUNCTION public.handle_payment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Case 1: New payment inserted with status 'Ödendi'
    IF (TG_OP = 'INSERT' AND NEW.status = 'Ödendi') THEN
        UPDATE public.students
        SET total_debt = GREATEST(0, COALESCE(total_debt, 0) - NEW.amount)
        WHERE id = NEW.student_id;
    
    -- Case 2: Existing payment updated to 'Ödendi'
    ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'Ödendi' AND OLD.status != 'Ödendi') THEN
        UPDATE public.students
        SET total_debt = GREATEST(0, COALESCE(total_debt, 0) - NEW.amount)
        WHERE id = NEW.student_id;
        
    -- Case 3: Payment changed back from 'Ödendi' to another status
    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'Ödendi' AND NEW.status != 'Ödendi') THEN
        UPDATE public.students
        SET total_debt = COALESCE(total_debt, 0) + OLD.amount
        WHERE id = NEW.student_id;

    -- Case 4: Deleted paid payment
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'Ödendi') THEN
        UPDATE public.students
        SET total_debt = COALESCE(total_debt, 0) + OLD.amount
        WHERE id = OLD.student_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_payment_status_change ON public.payments;
CREATE TRIGGER trigger_payment_status_change
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_payment_status_change();
