-- Fix: Update trigger to also handle amount changes on already-paid payments
-- Previously, if a payment was already 'Ödendi' and the amount was edited,
-- the debt would not be adjusted for the difference.

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
    
    -- Case 2: Existing payment updated to 'Ödendi' (status changed)
    ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'Ödendi' AND OLD.status != 'Ödendi') THEN
        UPDATE public.students
        SET total_debt = GREATEST(0, COALESCE(total_debt, 0) - NEW.amount)
        WHERE id = NEW.student_id;
        
    -- Case 3: Payment changed back from 'Ödendi' to another status
    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'Ödendi' AND NEW.status != 'Ödendi') THEN
        UPDATE public.students
        SET total_debt = COALESCE(total_debt, 0) + OLD.amount
        WHERE id = NEW.student_id;

    -- Case 4: Payment stays 'Ödendi' but amount was changed (edit scenario)
    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'Ödendi' AND NEW.status = 'Ödendi' AND OLD.amount != NEW.amount) THEN
        -- Reverse the old amount and apply the new amount
        UPDATE public.students
        SET total_debt = GREATEST(0, COALESCE(total_debt, 0) + OLD.amount - NEW.amount)
        WHERE id = NEW.student_id;

    -- Case 5: Deleted paid payment
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'Ödendi') THEN
        UPDATE public.students
        SET total_debt = COALESCE(total_debt, 0) + OLD.amount
        WHERE id = OLD.student_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;
