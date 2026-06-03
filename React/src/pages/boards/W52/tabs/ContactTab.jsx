import CONTACT_DATA from '../tabsData/contactData'
import '../tabsCss/contact.css'

export default function ContactTab() {
  const { DutyContacts, CommonContacts } = CONTACT_DATA.Data
  return (
    <main className="main-content">
      <div className="ct-panel">
        <div className="ct-page-title">
          <span className="ct-title-accent"></span>
          連絡資訊
          <span className="ct-title-caption">當日值班＋常用</span>
        </div>
        <div className="ct-columns">
          {/* 左：當日值班 */}
          <div className="ct-card ct-card-duty">
            <div className="ct-card-header">當日值班</div>
            <div className="ct-table-wrap">
              <table className="ct-table">
                <thead><tr><th>職務</th><th>姓名</th><th>院內分機</th><th>手機</th><th>時段</th></tr></thead>
                <tbody>
                  {DutyContacts.map(c => (
                    <tr key={c.ContactId}>
                      <td>{c.DutyTitle}</td>
                      <td>{c.Name}</td>
                      <td className="ct-ext">{c.Extension}</td>
                      <td className="ct-mobile">{c.Mobile}</td>
                      <td className="ct-slot">{c.TimeSlot}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* 右：常用電話 */}
          <div className="ct-card ct-card-common">
            <div className="ct-card-header">常用連絡電話</div>
            <div className="ct-table-wrap">
              <table className="ct-table">
                <thead><tr><th>單位</th><th className="ct-col-ext">分機 / 電話</th></tr></thead>
                <tbody>
                  {CommonContacts.map(c => (
                    <tr key={c.ContactId}>
                      <td>{c.Name}</td>
                      <td className="ct-col-ext ct-ext">{c.Extension}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
