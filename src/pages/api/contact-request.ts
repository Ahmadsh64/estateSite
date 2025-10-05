import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabaseClient.js';

export const POST: APIRoute = async ({ request }) => {
  try {
    // בדיקה אם הבקשה היא JSON
    const contentType = request.headers.get('content-type');
    let body: Record<string, any>;
    
    if (contentType && contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // אם זה form data, ננסה לקרוא כ-text ולפרסר
      const formData = await request.formData();
      body = {};
      formData.forEach((value, key) => {
        body[key] = value;
      });
    }
    
    console.log('Received body:', body);
    
    // וולידציה בסיסית - התאמה לשמות השדות שנשלחים מהפרונטאנד
    const requiredFields = ['propertyId', 'propertyTitle', 'propertyPrice', 'full-name', 'email', 'phone', 'guests', 'checkin', 'checkout'];
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return new Response(JSON.stringify({
          success: false,
          error: `שדה ${field} הוא חובה`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // וולידציה של תאריכים
    const checkinDate = new Date(body.checkin);
    const checkoutDate = new Date(body.checkout);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkinDate < today) {
      return new Response(JSON.stringify({
        success: false,
        error: 'תאריך כניסה לא יכול להיות בעבר'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (checkoutDate <= checkinDate) {
      return new Response(JSON.stringify({
        success: false,
        error: 'תאריך יציאה חייב להיות אחרי תאריך כניסה'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // וולידציה של אימייל
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'כתובת אימייל לא תקינה'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // וולידציה של מספר אורחים
    if (parseInt(body.guests) < 1 || parseInt(body.guests) > 20) {
      return new Response(JSON.stringify({
        success: false,
        error: 'מספר אורחים חייב להיות בין 1 ל-20'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // הכנת הנתונים להכנסה - התאמה לשמות השדות
    const contactRequestData = {
      property_id: body.propertyId,
      property_title: body.propertyTitle,
      property_price: parseInt(body.propertyPrice),
      full_name: body['full-name'].trim(),
      email: body.email.toLowerCase().trim(),
      phone: body.phone.trim(),
      guests: parseInt(body.guests),
      checkin_date: body.checkin,
      checkout_date: body.checkout,
      special_requests: body['special-requests']?.trim() || '',
      wants_offers: Boolean(body.offers),
      status: 'pending',
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown'
    };

    // הכנסה למסד הנתונים
    console.log('Inserting data:', contactRequestData);
    const { data, error } = await supabase
      .from('contact_requests')
      .insert([contactRequestData])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'שגיאה בשמירת הבקשה. אנא נסה שוב.',
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // הצלחה
    return new Response(JSON.stringify({
      success: true,
      message: 'הבקשה נשמרה בהצלחה! נחזור אליך בהקדם.',
      data: data[0]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'שגיאה בשרת. אנא נסה שוב מאוחר יותר.',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// GET - לקבלת כל הבקשות (לאדמין)
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');

    let query = supabase
      .from('contact_requests')
      .select('*')
      .order('created_at', { ascending: false });

    // סינון לפי סטטוס
    if (status && ['pending', 'contacted', 'closed'].includes(status)) {
      query = query.eq('status', status);
    }

    // הגבלת תוצאות
    if (limit) {
      const limitNum = parseInt(limit);
      if (limitNum > 0 && limitNum <= 100) {
        query = query.limit(limitNum);
      }
    }

    // דילוג על תוצאות
    if (offset) {
      const offsetNum = parseInt(offset);
      if (offsetNum >= 0) {
        query = query.range(offsetNum, offsetNum + (parseInt(limit || '20')) - 1);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'שגיאה בטעינת הבקשות'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: data || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'שגיאה בשרת'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - לעדכון סטטוס בקשה
export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    if (!body.id || !body.status) {
      return new Response(JSON.stringify({
        success: false,
        error: 'חסרים פרמטרים נדרשים'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!['pending', 'contacted', 'closed'].includes(body.status)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'סטטוס לא תקין'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await supabase
      .from('contact_requests')
      .update({ 
        status: body.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'שגיאה בעדכון הבקשה'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'הבקשה עודכנה בהצלחה',
      data: data[0]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'שגיאה בשרת'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - למחיקת בקשה
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    let id = url.searchParams.get('id');
    
    // אם המזהה לא נמצא ב-query parameters, ננסה לקבל אותו מה-body
    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch (e) {
        // אם גם זה נכשל, נמשיך עם null
      }
    }
    
    if (!id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'חסר מזהה בקשה'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { error } = await supabase
      .from('contact_requests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'שגיאה במחיקת הבקשה'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'הבקשה נמחקה בהצלחה'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'שגיאה בשרת'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};