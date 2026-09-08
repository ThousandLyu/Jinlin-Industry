import { db } from '@/lib/dataService'
import SectionHeader from '@/components/shared/SectionHeader'

export default async function AboutPage() {
  const settings = (await db.settings.getAll())[0] as any

  return (
    <div className="content-page-narrow">
      <SectionHeader
        eyebrow="About"
        title="关于项目"
        description="金陵工脉·薪火传承"
      />

      <section className="content-reading mb-8">
        <h2>项目简介</h2>
        <p className="mb-4">
          "金陵工脉·薪火传承——南京民族工业记忆数字复原与公益传承项目"是一项致力于
          南京民族工业文化遗产数字化保护与传承的公益项目。
        </p>
        <p className="mb-4">
          项目通过数字化手段——包括数字复原、云展览、史料数据库建设等方式，
          系统性地记录、整理、保护并传播南京民族工业的历史记忆，
          涵盖企业遗址、人物故事、工业技术、重大史实等丰富内容。
        </p>
        <p>
          我们希望以此唤起社会对民族工业遗产的关注，传承民族工业精神，
          让百年工脉在新时代焕发新生。
        </p>
      </section>

      <section className="content-reading mb-8">
        <h2>团队介绍</h2>
        <p>
          本项目由热爱南京历史与工业遗产的志愿者团队发起和维护。
          团队成员来自历史文化研究、数字技术、教育公益等多个领域，
          致力于用科技力量守护城市工业记忆。
        </p>
      </section>

      <section className="content-reading">
        <h2>联系方式</h2>
        {settings?.contactInfo ? (
          <p className="whitespace-pre-line">{settings.contactInfo}</p>
        ) : (
          <div className="space-y-2">
            <p>邮箱：contact@jinlinggongmai.com</p>
            <p>微信公众号：金陵工脉</p>
          </div>
        )}
      </section>
    </div>
  )
}
