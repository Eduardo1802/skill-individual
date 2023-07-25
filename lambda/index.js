

const Alexa = require('ask-sdk-core');
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');
var persistenceAdapter = getPersistenceAdapter();
const moment = require('moment-timezone');

function getPersistenceAdapter() {
    function isAlexaHosted() {
        return process.env.S3_PERSISTENCE_BUCKET ? true : false;
    }
    const tableName = 'homework_table';
    if(isAlexaHosted()) {
        const {S3PersistenceAdapter} = require('ask-sdk-s3-persistence-adapter');
        return new S3PersistenceAdapter({ 
            bucketName: process.env.S3_PERSISTENCE_BUCKET
        });
    } else {
        const {DynamoDbPersistenceAdapter} = require('ask-sdk-dynamodb-persistence-adapter');
        return new DynamoDbPersistenceAdapter({ 
            tableName: tableName,
            createTable: true
        });
    }
}

const languageStrings = {
    es:{
        translation: {
          NAME_MSG:'Recordatorio de tareas',    
          WELCOME_MSG: 'Bienvenido',
          WELCOME_DOS: 'Bienvenido a la skill recuerda mi tarea, esta skill es para cualquier persona y su objetivo es recordar una tarea dada por el usuario. Por favor diga "registra mi tarea" o "ayuda" para empezar. ¿Qué quieres hacer?',
          HOMEWORK_MSG:'%s tienes %s tareas pendientes. ',
          HELP_MSG: 'Puedes preguntarme: ¿cuáles son mis tareas? o ¿cuanto falta para entregar? o decirme: registra una tarea o elimina una tarea o haz un recordatorio. ',
          GOODBYE_MSG: 'Hasta luego!',
          FALLBACK_MSG: 'Lo siento, no se nada sobre eso. Por favor inténtalo otra vez.',
          ERROR_MSG: 'Lo siento, ha ocurrido un problema. Por favor inténtalo otra vez.',
          DATE_ERROR_MSG: 'La fecha debe ser mayor o igual al día de hoy. Intente de nuevo. Prueba decir, registra una tarea. ',
          DATE_MSG:'Error de Fecha',
          REGISTER_MSG: ' %s, recordare que tu %s es %s. La asignatura es %s. La fecha de entrega es el %s de %s del año %s. ',
          MISSING_MSG: '%s Parece que aun no tienes tareas. Prueba decir, registra una tarea. ',
          MISSING_HOMEWORK_MSG:'Días faltantes son: ',
          DAYLEFT_MSG:'%s días que se vencio',
          TODAY_MSG:'%s tu tarea se entrega Hoy!',
          INSERT_HOMEWORK_MSG:'%s: Fecha de entrega: %s, Días Faltantes: %s. ',
          REGISTER_NAME_MSG:'Haz Registrado una tarea!',
          NUMBER_MSG: 'tarea %s',
          PENDING_MSG:'Pendientes de tareas:',
          NO_PENDING_MSG:'%s, no tienes tareas asignadas.',
          RECORDATORIO_MSG: 'Sección de recordatorios',
          SECCION_MSG:'Sección de ayuda',
          BYE_MSG: 'Sección de despedida',
          TITLE_DELETE:'Tareas eliminadas',
          NO_HOMEWORK: 'No hay una %s registrada. ',
          DELET_CORRECT: '%s eliminada correctamente!',
          NO_SOPORT: 'Este dispositivo no soporta la operación que estás intentando realizar. ',
          ERROR_RECORDER: 'Ha habido un error al crear el recordatorio. ',
          CORRECT_RECORDER:'Recortadorio creado con exito de la %s',
          HOMEWORK:'tarea %s',
          CARD_MSG: 'Parece que no has autorizado el envío de recordatorios. Te he enviado una tarjeta a la app Alexa para que lo habilites. '
        }
    },
    en: {
        translation: {
            NAME_MSG: 'Task Reminder',
            WELCOME_MSG: 'Welcome',
            WELCOME_DOS: 'Welcome to the remember my task skill, this skill is for anyone and its objective is to remember a task given by the user. Please say "log my homework" or "help" to get started. What do you want to do?',
            HOMEWORK_MSG: '%s, you have %s pending tasks.',
            HELP_MSG: 'You can ask me: What are my tasks? or How much time is left to submit? or tell me: Register a task or delete a task or set a reminder.',
            GOODBYE_MSG: 'Goodbye!',
            FALLBACK_MSG: 'I am sorry, I do not know anything about that. Please try again.',
            ERROR_MSG: 'Sorry, there was a problem. Please try again.',
            DATE_ERROR_MSG: 'The date must be greater than or equal to today. Please try again. You can try saying: Register a task.',
            DATE_MSG: 'Date Error',
            REGISTER_MSG: '%s, I will remember that your %s is %s. The subject is %s. The due date is %s, %s %s of %s.',
            MISSING_MSG: '%s, it seems you do not have any tasks yet. Try saying: Register a task.',
            MISSING_HOMEWORK_MSG: 'Remaining days are:',
            DAYLEFT_MSG: '%s days overdue',
            TODAY_MSG: '%s, your task is due today!',
            INSERT_HOMEWORK_MSG: '%s: Due date: %s, Remaining days: %s.',
            REGISTER_NAME_MSG: 'You have registered a task!',
            NUMBER_MSG: 'Task %s',
            PENDING_MSG: 'Pending tasks:',
            NO_PENDING_MSG: '%s, you have no assigned tasks.',
            RECORDATORIO_MSG: 'Reminder Section',
            SECCION_MSG: 'Help Section',
            BYE_MSG: 'Farewell Section',
            TITLE_DELETE: 'Deleted Tasks',
            NO_HOMEWORK: 'There is no %s registered.',
            DELET_CORRECT: '%s deleted successfully!',
            NO_SOPORT: 'This device does not support the operation you are trying to perform.',
            ERROR_RECORDER: 'There was an error creating the reminder.',
            CORRECT_RECORDER: 'Reminder for %s created successfully!',
            HOMEWORK: 'Task %s',
            CARD_MSG: "It seems you haven't authorized reminder notifications. I have sent a card to the Alexa app for you to enable it."
        } 
     }
}

const DOCUMENT_ID_1 = "welcom_new";
const DOCUMENT_ID_2 = "complement_new";
const DOCUMENT_ID_3 = "reminder_new";

const createDirectivePayload = (aplDocumentId, dataSources = {}, tokenId = "documentToken") => {
    return {
        type: "Alexa.Presentation.APL.RenderDocument",
        token: tokenId,
        document: {
            type: "Link",
            src: "doc://alexa/apl/documents/" + aplDocumentId
        },
        datasources: dataSources
    }
};

const GIVEN_NAME_PERMISSION = ['alexa::profile:given_name:read'];
const REMINDERS_PERMISSION = ['alexa::alerts:reminders:skill:readwrite'];

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        const {attributesManager, serviceClientFactory, requestEnvelope} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        if(!sessionAttributes['name']){
            try {
                const {permissions} = requestEnvelope.context.System.user;
                if(!permissions)
                    throw { statusCode: 401, message: 'No permissions available' }; // there are zero permissions, no point in intializing the API
                const upsServiceClient = serviceClientFactory.getUpsServiceClient();
                const profileName = await upsServiceClient.getProfileGivenName();
                if (profileName) { 
                  sessionAttributes['name'] = profileName;
                }
            } catch (error) {
                console.log(JSON.stringify(error));
                if (error.statusCode === 401 || error.statusCode === 403) {
                  handlerInput.responseBuilder.withAskForPermissionsConsentCard(GIVEN_NAME_PERMISSION);
                }
            }
            
        }
        const name = sessionAttributes['name'] ? sessionAttributes['name'] : '';
        const tareas = sessionAttributes['tareas']; 
        const number_tasks = tareas.length;
        const datasource = {
            "dataSource": {
                "nombre": requestAttributes.t('NAME_MSG'),
                "titulo": requestAttributes.t('WELCOME_MSG'),
                "info": requestAttributes.t('HOMEWORK_MSG',name,number_tasks),
                "info_2": requestAttributes.t('HELP_MSG')
            }
        };
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            const aplDirective = createDirectivePayload(DOCUMENT_ID_1, datasource);
            handlerInput.responseBuilder.addDirective(aplDirective);
        }
        let speechText = requestAttributes.t('WELCOME_DOS');
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const RegisterHomeworkIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RegisterHomeworkIntent';
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const {intent} = handlerInput.requestEnvelope.request;
        const tarea = intent.slots.tarea.value;
        const materia = intent.slots.materia.value;
        const day = intent.slots.day.value;
        const month = intent.slots.month.resolutions.resolutionsPerAuthority[0].values[0].value.id;
        const monthName = intent.slots.month.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        const year = intent.slots.year.resolutions.resolutionsPerAuthority[0].values[0].value.id;
        const name = sessionAttributes['name'] ? sessionAttributes['name'] : '';
        
        const timezone = 'America/Mexico_City';
        const today = moment().tz(timezone).startOf('day');
        
        const selectedDate = moment(`${year}-${month}-${day}`, 'YYYY-MM-DD').tz(timezone).startOf('day');
        if (selectedDate.isBefore(today)) {
            const datasource = {
                "dataSource": {
                    "nombre": requestAttributes.t('NAME_MSG'),
                    "titulo": requestAttributes.t('DATE_MSG'),
                    "info": requestAttributes.t('DATE_ERROR_MSG'),
                    "info_2":  requestAttributes.t('HELP_MSG')
                }
            };
            if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
                const aplDirective = createDirectivePayload(DOCUMENT_ID_2, datasource);
                handlerInput.responseBuilder.addDirective(aplDirective);
            }
            return handlerInput.responseBuilder
                .speak(requestAttributes.t('DATE_ERROR_MSG'))
                .getResponse();
        }
        
        if (!sessionAttributes['tareas']) {
            sessionAttributes['tareas'] = [];
        }
        const tareas = sessionAttributes['tareas']; 
        const number_tasks = tareas.length + 1;
        let get_number,number;
        number = requestAttributes.t('NUMBER_MSG',number_tasks);
        
        tareas.forEach(tarea => {
          get_number = tarea.number;
          if (number === get_number) {
            let nu = (number_tasks+1)
            number = requestAttributes.t('NUMBER_MSG',nu);
          }
        });
    
        sessionAttributes['tareas'].push({number,tarea, materia, day, month, monthName, year});
        const datasource = {
            "dataSource": {
                "nombre": requestAttributes.t('NAME_MSG'),
                "titulo": requestAttributes.t('REGISTER_NAME_MSG'),
                "info": requestAttributes.t('REGISTER_MSG',name,number, tarea, materia, day, monthName, year),
                "info_2":  requestAttributes.t('HELP_MSG')
            }
        };
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            const aplDirective = createDirectivePayload(DOCUMENT_ID_2, datasource);
            handlerInput.responseBuilder.addDirective(aplDirective);
        }
        return handlerInput.responseBuilder
            .speak(requestAttributes.t('REGISTER_MSG',name,number, tarea, materia, day, monthName, year) + requestAttributes.t('HELP_MSG'))
            .reprompt(requestAttributes.t('HELP_MSG'))
            .getResponse();
    }
};

const HomeworkIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'homeworkIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const { attributesManager } = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const tareas = sessionAttributes['tareas'];
        const name = sessionAttributes['name'] ? sessionAttributes['name'] : '';
        const listItems = [];
        let speechText = '';
        let datasource = '';
        if (tareas && tareas.length > 0) {
            tareas.forEach(tarea => {
                listItems.push({
                    "tareas": `${tarea.number}: ${tarea.tarea} ${tarea.materia}. Fecha de entrega: ${tarea.day}/${tarea.month}/${tarea.year}`
                });
            });
            datasource = {
                "dataSource": {
                    "nombre": requestAttributes.t('NAME_MSG'),
                    "titulo": requestAttributes.t('PENDING_MSG',name),
                    "info_2": requestAttributes.t('HELP_MSG'), 
                    "listItems": listItems
                }
            };
            speechText = requestAttributes.t('PENDING_MSG',name) //name+", tus tareas son: ";
            tareas.forEach(tarea => {
                speechText += `${tarea.number}: ${tarea.tarea} ${tarea.materia}. `;
            });
            
            if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
                const aplDirective = createDirectivePayload(DOCUMENT_ID_3, datasource);
                handlerInput.responseBuilder.addDirective(aplDirective);
            }
        } else {
            datasource = {
                "dataSource": {
                    "nombre": requestAttributes.t('NAME_MSG'),
                    "titulo": requestAttributes.t('NO_PENDING_MSG',name),
                    "info_2": requestAttributes.t('HELP_MSG'), 
                    "listItems": []
                }
            };
            speechText = requestAttributes.t('NO_PENDING_MSG',name);
            if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
                const aplDirective = createDirectivePayload(DOCUMENT_ID_3, datasource);
                handlerInput.responseBuilder.addDirective(aplDirective);
            }
        }
        return handlerInput.responseBuilder
            .speak(speechText + requestAttributes.t('HELP_MSG'))
            .reprompt(requestAttributes.t('HELP_MSG'))
            .getResponse();
    }
};

const sayHomeworkIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'sayHomeworkIntent';
    },
    handle(handlerInput) {
        const { attributesManager } = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const sessionAttributes = attributesManager.getSessionAttributes();
        const tareas = sessionAttributes['tareas'];
        const listItems = [];
        const name = sessionAttributes['name'] ? sessionAttributes['name'] : '';
        let speechText,daysLeft,datasource,days;

       if (tareas && tareas.length > 0) {
            const timezone = 'America/Mexico_City';
            const today = moment().tz(timezone).startOf('day');
            
            tareas.forEach((tarea, index) => {
                const nextHomeworkDate = moment(`${tarea.month}/${tarea.day}/${tarea.year}`, 'MM/DD/YYYY').tz(timezone).startOf('day');
                days = nextHomeworkDate.diff(today, 'days');
                daysLeft = days+1;
                if (daysLeft === 0) {
                    daysLeft = requestAttributes.t('TODAY_MSG',daysLeft);
                }
        
                if (daysLeft <= 1){
                    daysLeft = requestAttributes.t('DAYLEFT_MSG',daysLeft);
                }
                
                let homework = tarea.number;
                let fecha= `${tarea.day}/${tarea.month}/${tarea.year}`
                let days_= daysLeft
                listItems.push({
                    // "tareas": `${tarea.number}: Fecha de entrega: ${tarea.day}/${tarea.month}/${tarea.year}, Días Faltantes: ${daysLeft}. ` 
                    "tareas": requestAttributes.t('INSERT_HOMEWORK_MSG',homework,fecha,days_)
                });
            });
            
            speechText = requestAttributes.t('MISSING_HOMEWORK_MSG',name);
            tareas.forEach(tarea => {
                const nextHomeworkDate = moment(`${tarea.month}/${tarea.day}/${tarea.year}`, 'MM/DD/YYYY').tz(timezone).startOf('day');
                days = nextHomeworkDate.diff(today, 'days');
                daysLeft = days+1;
                
                if (daysLeft === 0) {
                    daysLeft = requestAttributes.t('TODAY_MSG',daysLeft);
                }
        
                if (daysLeft <= 1){
                    daysLeft = requestAttributes.t('DAYLEFT_MSG',daysLeft);
                }
                speechText += `${tarea.number}: días faltantes ${daysLeft},  `;
            });
            
            datasource = {
                "dataSource": {
                    "nombre": requestAttributes.t('NAME_MSG'),
                    "titulo": requestAttributes.t('MISSING_HOMEWORK_MSG',name),
                    "info_2": requestAttributes.t('HELP_MSG'), 
                    "listItems": listItems
                }
            };
            if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
                const aplDirective = createDirectivePayload(DOCUMENT_ID_3, datasource);
                handlerInput.responseBuilder.addDirective(aplDirective);
            }
            
        } else {
            speechText = requestAttributes.t('MISSING_MSG',name);
        }
            
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(requestAttributes.t('HELP_MSG'))
            .getResponse();
    }
};

const DeleteHomeworkIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'deleteIntent'
    );
  },
  handle(handlerInput) {
    const { attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const requestAttributes = attributesManager.getRequestAttributes();
    const { intent } = handlerInput.requestEnvelope.request;
    let speechText, get_number, number,conseguir_num,number_;
    conseguir_num = intent.slots.numero.value;
    number = requestAttributes.t('HOMEWORK',conseguir_num); 
    const tareas = sessionAttributes['tareas'];
    speechText = requestAttributes.t('HOMEWORK',number);
    tareas.forEach((tarea, index) => {
      get_number = tarea.number;
      if (number === get_number) {
        tareas.splice(index, 1); 
        speechText = requestAttributes.t('DELET_CORRECT',number);
      }
    });
    
    const datasource = {
        "dataSource": {
            "nombre": requestAttributes.t('NAME_MSG'),
            "titulo": speechText,
            "info": ' ',
            "info_2":  requestAttributes.t('HELP_MSG')
        }
    };
    if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
        const aplDirective = createDirectivePayload(DOCUMENT_ID_2, datasource);
        handlerInput.responseBuilder.addDirective(aplDirective);
    }
    
    speechText += ' '+requestAttributes.t('HELP_MSG')
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(requestAttributes.t('HELP_MSG'))
      .getResponse();
  },
};

const formatIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'formatIntent';
    },
    handle(handlerInput) {
        const { attributesManager } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const requestAttributes = attributesManager.getRequestAttributes();
        let speechText;
        const contador = sessionAttributes['contador'] = 0
        const tareas = sessionAttributes['tareas'] = [];
        speechText = requestAttributes.t('TITLE_DELETE'); 
        
        const datasource = {
            "dataSource": {
                "nombre": requestAttributes.t('NAME_MSG'),
                "titulo": speechText,
                "info": ' ',
                "info_2":  requestAttributes.t('HELP_MSG')
            }
        };
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            const aplDirective = createDirectivePayload(DOCUMENT_ID_2, datasource);
            handlerInput.responseBuilder.addDirective(aplDirective);
        }
        return handlerInput.responseBuilder
            .speak(speechText + requestAttributes.t('HELP_MSG'))
            .getResponse();
    }
};

function createReminderData(reminderTime, timezone, message) {
  return {
    requestTime: moment().toISOString(),
    trigger: {
      type: 'SCHEDULED_ABSOLUTE',
      scheduledTime: reminderTime.tz(timezone).format('YYYY-MM-DDTHH:mm:ss'),
      timeZoneId: timezone,
    },
    alertInfo: {
      spokenInfo: {
        content: [
          {
            locale: 'es-MX',
            text: message,
          },
        ],
      },
    },
    pushNotification: {
      status: 'ENABLED',
    },
  };
}

const remindIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'remindIntent';
    },
    async handle(handlerInput) {
        const { attributesManager, serviceClientFactory, requestEnvelope } = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const requestAttributes = attributesManager.getRequestAttributes();
        const { intent } = handlerInput.requestEnvelope.request;
        const timezone = 'America/Mexico_City';
        const tareas = sessionAttributes['tareas'];
        const name = sessionAttributes['name'] ? sessionAttributes['name'] : '';
        const today = moment().tz(timezone).startOf('day');
        let speechText, get_number, number, message,days,daysLeft;
        number = intent.slots.number.value
        message = requestAttributes.t('HOMEWORK',number);
         
        tareas.forEach(tarea => {
            get_number = tarea.number;
            if (number === get_number) {
                const nextHomeworkDate = moment(`${tarea.month}/${tarea.day}/${tarea.year}`, 'MM/DD/YYYY').tz(timezone).startOf('day');
                days = nextHomeworkDate.diff(today, 'days');
                daysLeft = days+1;
                message = `${tarea.number}: ${tarea.tarea} ${tarea.materia}. `;
          }
        });
        
        
        const reminderTime = moment().add(daysLeft, 'minutes');
        
        try {
            const {permissions} = requestEnvelope.context.System.user;
            if(!permissions)
                throw { statusCode: 401, message: 'No permissions available' };
            const reminderServiceClient = serviceClientFactory.getReminderManagementServiceClient();
            const remindersList = await reminderServiceClient.getReminders();
            console.log('Current reminders: ' + JSON.stringify(remindersList));
            console.log(JSON.stringify(remindersList));
            // delete previous reminder if present
            const previousReminder = sessionAttributes['reminderId'];
            if(previousReminder){
                await reminderServiceClient.deleteReminder(previousReminder);
                delete sessionAttributes['reminderId'];
                console.log('Deleted previous reminder with token: ' + previousReminder);
            }
            // create reminder structure
            const reminder = createReminderData(reminderTime, timezone, message);
               
            const reminderResponse = await reminderServiceClient.createReminder(reminder); // the response will include an "alertToken" which you can use to refer to this reminder
            // save reminder id in session attributes
            sessionAttributes['reminderId'] = reminderResponse.alertToken;
            console.log('Reminder created with token: ' + reminderResponse.alertToken);
            speechText = speechText = requestAttributes.t('CORRECT_RECORDER'); 
        } catch (error) {
            console.log(JSON.stringify(error));
            switch (error.statusCode) {
                case 401: // the user has to enable the permissions for reminders, let's attach a permissions card to the response
                    handlerInput.responseBuilder.withAskForPermissionsConsentCard(REMINDERS_PERMISSION);
                    speechText =requestAttributes.t('CARD_MSG');
                    break;
                case 403: // devices such as the simulator do not support reminder management
                    // speechText = 'Este dispositivo no soporta la operación que estás intentando realizar. '; 
                    speechText = requestAttributes.t('NO_SOPORT');
                    break;
                default:
                    speechText = requestAttributes.t('ERROR_RECORDER'); 
            }
            
        }
        const datasource = {
            "dataSource": {
                "nombre": requestAttributes.t('NAME_MSG'),
                "titulo": requestAttributes.t('RECORDATORIO_MSG'),
                "info": ' ',
                "info_2":  requestAttributes.t('HELP_MSG')
            }
        };
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            const aplDirective = createDirectivePayload(DOCUMENT_ID_2, datasource);
            handlerInput.responseBuilder.addDirective(aplDirective);
        }
        
        return handlerInput.responseBuilder
          .speak(speechText + requestAttributes.t('HELP_MSG'))
          .reprompt(requestAttributes.t('HELP_MSG'))
          .getResponse();
    }
};


const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const datasource = {
            "dataSource": {
                "nombre": requestAttributes.t('NAME_MSG'),
                "titulo": requestAttributes.t('SECCION_MSG'),
                "info": ' ',
                "info_2":  requestAttributes.t('HELP_MSG')
            }
        };
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            const aplDirective = createDirectivePayload(DOCUMENT_ID_2, datasource);
            handlerInput.responseBuilder.addDirective(aplDirective);
        }
        
        return handlerInput.responseBuilder
            .speak(requestAttributes.t('HELP_MSG'))
            .reprompt(requestAttributes.t('HELP_REPROMPT_MSG'))
            .withShouldEndSession(false) 
            .getResponse();
    }
};


const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        
        const datasource = {
            "dataSource": {
                "nombre": requestAttributes.t('NAME_MSG'),
                "titulo": requestAttributes.t('BYE_MSG'),
                "info": requestAttributes.t('GOODBYE_MSG'),
                "info_2":  requestAttributes.t('HELP_MSG')
            }
        };
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            const aplDirective = createDirectivePayload(DOCUMENT_ID_2, datasource);
            handlerInput.responseBuilder.addDirective(aplDirective);
        }
        
        return handlerInput.responseBuilder
            .speak(requestAttributes.t('GOODBYE_MSG'))
            .getResponse();
    }
};


const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        const datasource = {
            "dataSource": {
                "nombre": requestAttributes.t('NAME_MSG'),
                "titulo": ' ',
                "info": requestAttributes.t('FALLBACK_MSG'),
                "info_2":  requestAttributes.t('HELP_MSG')
            }
        };
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            const aplDirective = createDirectivePayload(DOCUMENT_ID_2, datasource);
            handlerInput.responseBuilder.addDirective(aplDirective);
        }
        
        return handlerInput.responseBuilder
            .speak(requestAttributes.t('FALLBACK_MSG'))
            // .reprompt(speechText)
            .getResponse();
    }
};


const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};


const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};


const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const {attributesManager} = handlerInput;
        const requestAttributes = attributesManager.getRequestAttributes();
        
        const datasource = {
            "dataSource": {
                "nombre": requestAttributes.t('NAME_MSG'),
                "titulo": ' ',
                "info": requestAttributes.t('ERROR_MSG'),
                "info_2":  requestAttributes.t('HELP_MSG')
            }
        };
        if (Alexa.getSupportedInterfaces(handlerInput.requestEnvelope)['Alexa.Presentation.APL']) {
            const aplDirective = createDirectivePayload(DOCUMENT_ID_2, datasource);
            handlerInput.responseBuilder.addDirective(aplDirective);
        }
        
        const speakOutput = requestAttributes.t('ERROR_MSG')
        
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// This request interceptor will log all incoming requests to this lambda
const LoggingRequestInterceptor = {
    process(handlerInput) {
        console.log(`Incoming request: ${JSON.stringify(handlerInput.requestEnvelope.request)}`);
    }
};

// This response interceptor will log all outgoing responses of this lambda
const LoggingResponseInterceptor = {
    process(handlerInput, response) {
      console.log(`Outgoing response: ${JSON.stringify(response)}`);
    }
};

// This request interceptor will bind a translation function 't' to the requestAttributes.
const LocalizationRequestInterceptor = {
  process(handlerInput) {
    const localizationClient = i18n.use(sprintf).init({
      lng: handlerInput.requestEnvelope.request.locale,
      overloadTranslationOptionHandler: sprintf.overloadTranslationOptionHandler,
      resources: languageStrings,
      returnObjects: true
    });
    const attributes = handlerInput.attributesManager.getRequestAttributes();
    attributes.t = function (...args) {
      return localizationClient.t(...args);
    }
  }
};

const LoadAttributesRequestInterceptor = {
    async process(handlerInput) {
        if(handlerInput.requestEnvelope.session['new']){ //is this a new session?
            const {attributesManager} = handlerInput;
            const persistentAttributes = await attributesManager.getPersistentAttributes() || {};
            //copy persistent attribute to session attributes
            handlerInput.attributesManager.setSessionAttributes(persistentAttributes);
        }
    }
};

const SaveAttributesResponseInterceptor = {
    async process(handlerInput, response) {
        const {attributesManager} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const shouldEndSession = (typeof response.shouldEndSession === "undefined" ? true : response.shouldEndSession);//is this a session end?
        if(shouldEndSession || handlerInput.requestEnvelope.request.type === 'SessionEndedRequest') { // skill was stopped or timed out            
            attributesManager.setPersistentAttributes(sessionAttributes);
            await attributesManager.savePersistentAttributes();
        }
    }
};


exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HomeworkIntentHandler,
        RegisterHomeworkIntentHandler,
        formatIntentHandler,
        DeleteHomeworkIntentHandler,
        // CancelIntentHandler, // Agregado
        // StopIntentHandler, // Agregado
        sayHomeworkIntentHandler,
        remindIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .addRequestInterceptors(
            LocalizationRequestInterceptor,
            LoggingRequestInterceptor,
            LoadAttributesRequestInterceptor)
    .addResponseInterceptors(
            LoggingResponseInterceptor,
            SaveAttributesResponseInterceptor)
    .withPersistenceAdapter(persistenceAdapter)
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();