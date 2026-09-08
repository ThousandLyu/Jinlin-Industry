import RegisterForm from '@/components/RegisterForm'

export default function AdminRegisterPage() {
  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-xl shadow border border-[#E8DCC8] p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">后台账户注册</h1>
        <p className="text-sm text-gray-500 text-center mb-6">后台注册需要管理员密钥。</p>
        <RegisterForm role="admin" />
      </div>
    </div>
  )
}
