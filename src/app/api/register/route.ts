import { NextRequest, NextResponse } from 'next/server';
import { registerAccount } from '@/lib/userAccounts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: '前台用户注册已关闭，仅保留后台管理员注册。' },
        { status: 403 }
      );
    }

    const account = await registerAccount({
      username: body.username,
      password: body.password,
      role: 'admin',
      name: body.name,
      gender: body.gender,
      phone: body.phone,
      email: body.email,
      adminKey: body.adminKey,
    });

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        username: account.username,
        role: account.role,
        name: account.name,
        phone: account.phone,
        email: account.email,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '注册失败' },
      { status: 400 }
    );
  }
}
