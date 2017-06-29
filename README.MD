#Helpdesk Forms API
- Permite o cadastro de Serviços e neles formulários que serão preenchidos pelo usuário final a fim de solicitar o 
Serviço.
- Permite a criação de Requisições (de Serviço)

##Conceitos
- Serviço: é toda atividade específica ofertada em um catálogo e que possui determinados requisitos, informações a serem
preenchidas pelo usuário final em um formulário específico, bem como informações sobre ações de notificação.
- Formulário: coleção de campos usados para a instrução de uma Requisição. Esses campos são customizáveis através de 
tipo, quantidade e validações adicionais. A especificação desse formulário e seus campos está dentro de um Serviço e 
adere ao JSON Schema draft 4.
- Requisição: é o conjunto de informações referentes a determinado Serviço, uma Requisição de Serviço.