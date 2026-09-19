import { Card } from '../shared/components/ui'

const sections = [
  {
    title: 'Datos que utilizamos',
    content: (
      <>
        Podemos guardar tu nombre, teléfono y, si eliges delivery, la dirección de entrega. También conservamos los
        productos y datos de tus pedidos, un identificador de sesión anónima y el contenido del carrito en tu
        dispositivo.
      </>
    ),
  },
  {
    title: 'Para qué usamos tus datos',
    content: (
      <>
        Los usamos únicamente para procesar tus pedidos, coordinar el retiro o la entrega, avisarte sobre su estado y
        conservar tu carrito entre visitas.
      </>
    ),
  },
  {
    title: 'Servicios que hacen funcionar la tienda',
    content: (
      <>
        AndesMarket usa Supabase para la sesión técnica anónima y el almacenamiento seguro de datos y pedidos, y
        Vercel para alojar y servir la aplicación. Estos proveedores pueden procesar la información necesaria para
        prestar sus servicios técnicos.
      </>
    ),
  },
  {
    title: 'Conservación y seguridad',
    content: (
      <>
        Conservamos la información mientras sea necesaria para gestionar los pedidos, mantener su historial y atender
        solicitudes. La base de datos restringe el acceso para que cada sesión solo pueda consultar sus propios datos.
        No vendemos ni alquilamos tu información personal.
      </>
    ),
  },
  {
    title: 'Tus opciones y derechos',
    content: (
      <>
        Puedes solicitar información sobre tus datos, corregirlos o pedir su eliminación. Ten en cuenta que algunos
        registros pueden conservarse cuando sean necesarios para cumplir obligaciones aplicables o resolver una
        solicitud relacionada con un pedido.
      </>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <article className="mx-auto flex max-w-3xl animate-fade-up flex-col gap-5">
      <header>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-dark">Tu información</p>
        <h1 className="mt-1 font-display text-[32px] font-extrabold leading-none tracking-[-0.035em] text-ink sm:text-4xl">
          Política de privacidad
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          En AndesMarket usamos solo la información necesaria para preparar tus compras y brindarte una experiencia
          sencilla y segura.
        </p>
      </header>

      <Card className="overflow-hidden">
        <div className="border-b border-ink/10 bg-brand-light px-5 py-4 sm:px-7">
          <p className="text-sm font-bold text-brand-deep">Última actualización: 19 de septiembre de 2026</p>
        </div>
        <div className="divide-y divide-ink/10 px-5 sm:px-7">
          <section className="py-6">
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-ink">Quién es responsable</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              AndesMarket es responsable del uso de la información que compartes al utilizar esta tienda en línea.
            </p>
          </section>

          {sections.map((section) => (
            <section key={section.title} className="py-6">
              <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-ink">{section.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{section.content}</p>
            </section>
          ))}

          <section className="py-6">
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-ink">Contacto</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Para realizar una consulta o solicitud sobre privacidad, comunícate con nosotros:
            </p>
            <address className="mt-4 flex flex-col items-start gap-2 not-italic">
              <a
                href="tel:+584122636533"
                className="rounded-md font-bold text-brand-dark underline decoration-brand/50 underline-offset-4 hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
              >
                0412-2636533
              </a>
              <a
                href="mailto:rondon.jose.757@gmail.com"
                className="break-all rounded-md font-bold text-brand-dark underline decoration-brand/50 underline-offset-4 hover:text-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
              >
                rondon.jose.757@gmail.com
              </a>
            </address>
          </section>

          <section className="py-6">
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-ink">Cambios a esta política</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Si cambia la forma en que usamos la información, actualizaremos este texto y la fecha indicada al inicio
              de la página.
            </p>
          </section>
        </div>
      </Card>
    </article>
  )
}
