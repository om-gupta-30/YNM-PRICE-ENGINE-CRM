import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/utils/supabaseClient';
import { formatTimeIST } from '@/lib/utils/dateFormatters';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const accountId = searchParams.get('account_id');
    const contactId = searchParams.get('contact_id');
    const employee = searchParams.get('employee');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const search = searchParams.get('search');
    const isAdmin = searchParams.get('isAdmin') === 'true';
    const currentUser = searchParams.get('currentUser') || '';
    const limit = parseInt(searchParams.get('limit') || '500', 10);

    const supabase = createSupabaseServerClient();

    // Try with created_at first, then fallback to createdAt
    const tryFetchActivities = async (timestampColumn: string) => {
      const selectClause = `id, account_id, contact_id, employee_id, activity_type, description, metadata, ${timestampColumn}, accounts:account_id(account_name), contacts:contact_id(name)`;
      
      let query = supabase
        .from('activities')
        .select(selectClause)
        .order(timestampColumn, { ascending: false })
        .limit(limit);

      if (!isAdmin && currentUser) {
        query = query.eq('employee_id', currentUser);
      } else if (employee) {
        query = query.eq('employee_id', employee);
      }

      if (type) query = query.eq('activity_type', type);
      if (accountId) query = query.eq('account_id', Number(accountId));
      if (contactId) query = query.eq('contact_id', Number(contactId));
      if (dateFrom) query = query.gte(timestampColumn, new Date(dateFrom).toISOString());
      if (dateTo) query = query.lte(timestampColumn, new Date(dateTo).toISOString());
      if (search) query = query.ilike('description', `%${search}%`);

      return await query;
    };

    // Try created_at first
    let result: any = await tryFetchActivities('created_at');
    let usedColumn = 'created_at';
    
    // If created_at doesn't exist, try createdAt
    if (result.error && result.error.message?.includes('does not exist')) {
      result = await tryFetchActivities('createdAt');
      usedColumn = 'createdAt';
    }
    
    // If createdAt also doesn't exist, try without timestamp column
    if (result.error && result.error.message?.includes('does not exist')) {
      const selectClause = `id, account_id, contact_id, employee_id, activity_type, description, metadata, accounts:account_id(account_name), contacts:contact_id(name)`;
      
      let query = supabase
        .from('activities')
        .select(selectClause)
        .order('id', { ascending: false })
        .limit(limit);

      if (!isAdmin && currentUser) {
        query = query.eq('employee_id', currentUser);
      } else if (employee) {
        query = query.eq('employee_id', employee);
      }

      if (type) query = query.eq('activity_type', type);
      if (accountId) query = query.eq('account_id', Number(accountId));
      if (contactId) query = query.eq('contact_id', Number(contactId));
      if (search) query = query.ilike('description', `%${search}%`);

      result = await query;
      usedColumn = '';
    }

    const { data, error } = result;

    if (error) {
      console.error('Activities fetch error:', error);
      return NextResponse.json({ error: 'Unable to fetch activities' }, { status: 500 });
    }

    // Fetch logout reasons for logout activities
    const logoutActivityIds = data?.filter((a: any) => a.activity_type === 'logout').map((a: any) => a.id) || [];
    let logoutReasonsMap: Record<number, any> = {};
    
    if (logoutActivityIds.length > 0) {
      const { data: logoutReasons } = await supabase
        .from('logout_reasons')
        .select('id, user_id, reason_tag, reason_text, created_at')
        .in('user_id', data?.filter((a: any) => a.activity_type === 'logout').map((a: any) => a.employee_id) || [])
        .order('created_at', { ascending: false });
      
      // Match logout reasons with activities by employee_id and timestamp
      if (logoutReasons) {
        data?.forEach((activity: any) => {
          const activityTimestamp = usedColumn
            ? activity[usedColumn]
            : (activity.created_at ?? activity.createdAt);
          if (!activityTimestamp) return;
          if (activity.activity_type === 'logout') {
            const reason = logoutReasons.find(
              r => r.user_id === activity.employee_id &&
              Math.abs(new Date(r.created_at).getTime() - new Date(activityTimestamp).getTime()) < 60000 // Within 1 minute
            );
            if (reason) {
              logoutReasonsMap[activity.id] = reason;
            }
          }
        });
      }
    }

    const normalized =
      data?.map((item: any) => {
        const { accounts, contacts, ...rest } = item;
        const logoutReason = logoutReasonsMap[item.id];
        const rawCreatedAt = usedColumn
          ? item[usedColumn]
          : (item.created_at ?? item.createdAt);
        
        return {
          ...rest,
          created_at: rawCreatedAt || null,
          account_name: accounts?.account_name || null,
          contact_name: contacts?.name || null,
          logout_reason: logoutReason ? {
            reason_tag: logoutReason.reason_tag,
            reason_text: logoutReason.reason_text,
            created_at: logoutReason.created_at || null,
          } : null,
          login_time: item.metadata?.login_time ? formatTimeIST(item.metadata.login_time) : null,
          logout_time: item.metadata?.logout_time ? formatTimeIST(item.metadata.logout_time) : null,
        };
      }) || [];

    return NextResponse.json({ success: true, activities: normalized });
  } catch (error: any) {
    console.error('Activities GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      account_id,
      contact_id,
      employee_id,
      activity_type,
      description,
      metadata,
    } = body;

    if (!employee_id || !activity_type || !description) {
      return NextResponse.json(
        { error: 'employee_id, activity_type, and description are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('activities')
      .insert({
        account_id: account_id || null,
        contact_id: contact_id || null,
        employee_id,
        activity_type,
        description,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Activities POST error:', error);
      return NextResponse.json({ error: 'Unable to create activity' }, { status: 500 });
    }

    return NextResponse.json({ success: true, activity: data });
  } catch (error: any) {
    console.error('Activities POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

