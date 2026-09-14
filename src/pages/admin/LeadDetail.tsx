import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import LeadDetailPanel from '../../components/LeadDetailPanel'

/** Página completa de un lead (enlace directo). El tablero abre el mismo detalle en un modal. */
export default function LeadDetail() {
  const { documentId = '' } = useParams()
  const navigate = useNavigate()

  return (
    <div>
      <Link to="/leads" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Leads
      </Link>
      <LeadDetailPanel documentId={documentId} onDeleted={() => navigate('/leads')} />
    </div>
  )
}
