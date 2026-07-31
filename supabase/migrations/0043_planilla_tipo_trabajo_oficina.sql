-- Pedido del usuario (2026-07-31): en Planilla, para colaboradores de
-- Campo, el tipo de trabajo "Taller" pasa a llamarse "Oficina". Además,
-- la jornada queda ligada al tipo de trabajo: si es Oficina se sigue
-- eligiendo Día completo/Medio día; si es Proyecto, la jornada ahora es
-- siempre "Proyecto" (ya no se elige día completo/medio día).

alter table planilla_pagos drop constraint planilla_pagos_tipo_trabajo_check;
update planilla_pagos set tipo_trabajo = 'oficina' where tipo_trabajo = 'taller';
alter table planilla_pagos add constraint planilla_pagos_tipo_trabajo_check check (tipo_trabajo in ('proyecto', 'oficina'));

alter table planilla_pagos drop constraint planilla_pagos_jornada_check;
-- Normaliza los pagos históricos de tipo Proyecto para que cumplan la
-- nueva regla (antes se guardaba día completo/medio día a mano también
-- para estos).
update planilla_pagos set jornada = 'proyecto' where tipo_trabajo = 'proyecto';
alter table planilla_pagos add constraint planilla_pagos_jornada_check check (jornada in ('completo', 'medio', 'proyecto'));
