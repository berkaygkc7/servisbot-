-- Bu kod, daha önceden sistem tarafından otomatik olarak atanmış olan 
-- rastgele fatura numaralarını (INV- veya SRV- ile başlayan) temizler.
-- Alanı veritabanında tamamen boş (NULL) hale getirir.

UPDATE public.payments
SET invoice_no = ''
WHERE invoice_no LIKE 'INV-%' OR invoice_no LIKE 'SRV-%';

-- Eğer daha önce elle girilmiş olanlar dahil BÜTÜN fatura numaralarını
-- sıfırlamak (boşaltmak) isterseniz, üstteki kodu silip aşağıdaki kodu çalıştırabilirsiniz:
-- UPDATE public.payments SET invoice_no = '';
