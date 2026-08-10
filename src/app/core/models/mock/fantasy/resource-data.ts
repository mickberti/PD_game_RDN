import { GameUtilsService } from "../../../services/ui/formatting/game-utils.service";
import { ResourceItem, ResourceType, ResourceTypeId } from "../../game.models";


export const resourceTypesMock: ResourceType[] = [
  {
    id: 'res1',
    title: 'Polveri',
    description: 'Materiali di affinamento consumati nei potenziamenti progressivi: entrano in gioco quando migliori statistiche, equipaggiamenti o altri upgrade legati alla crescita ordinaria.',
    frame: { name: 'resource-dust-red', effect: 'none' },
  },
  {
    id: 'res2',
    title: 'Gemme',
    description: 'Catalizzatori rari per upgrade importanti e soglie di avanzamento: vengono richieste quando il potenziamento è più avanzato, prezioso o vicino a un salto di qualità.',
    frame: { name: 'resource-gem-red-octagon', effect: 'none' },
  },
];

export const resourceTypeById: Record<ResourceTypeId, ResourceType> =
  resourceTypesMock.reduce<Record<ResourceTypeId, ResourceType>>(
    (acc, type) => {
      acc[type.id] = type;
      return acc;
    },
    {} as Record<ResourceTypeId, ResourceType>
  );
  
  // -------------------------------------
  // Export finale: 5 mastery per ciascuno delle 2 tipologie di risorse
  // Totale = 10 ChestItem
  // -------------------------------------
  
  export const resourceItemsMock: ResourceItem[] = [
    {
      id: 'resource-dust-red',
      itemType: 'resource',
      name: 'Polvere Rossa',
      description: 'Risorsa base per i primi potenziamenti. Serve per avviare upgrade economici e viene utilizzata nelle fasi iniziali di crescita di eroi ed equipaggiamenti.',
      type: resourceTypeById['res1'],
      level: 1,
	  mastery: 1,
      frame: { name: 'resource-dust-red', effect: 'none' },
    },
    {
      id: 'resource-dust-blue',
      itemType: 'resource',
      name: 'Polvere Blu',
      description: 'Polvere intermedia per consolidare i progressi. Serve quando gli upgrade superano il livello introduttivo e richiedono materiali più stabili.',
      type: resourceTypeById['res1'],
      level: 2,
	  mastery: 2,
      frame: { name: 'resource-dust-blue', effect: 'none' },
    },
    {
      id: 'resource-dust-green',
      itemType: 'resource',
      name: 'Polvere Verde',
      description: 'Materiale di sviluppo avanzato. Viene usato per potenziamenti di metà progressione, quando costi e benefici iniziano a incidere in modo evidente.',
      type: resourceTypeById['res1'],
      level: 3,
	  mastery: 3,
      frame: { name: 'resource-dust-green', effect: 'none' },
    },
    {
      id: 'resource-dust-purple',
      itemType: 'resource',
      name: 'Polvere Viola',
      description: 'Polvere rara per miglioramenti specialistici. Serve negli upgrade alti, quando vuoi rafforzare asset già evoluti o preparare un salto di mastery.',
      type: resourceTypeById['res1'],
      level: 4,
	  mastery: 4,
      frame: { name: 'resource-dust-purple', effect: 'none' },
    },
    {
      id: 'resource-dust-gold',
      itemType: 'resource',
      name: 'Polvere Dorata',
      description: 'Materiale prezioso per potenziamenti di massimo livello. Viene consumata nelle fasi finali della crescita, dove ogni upgrade ha un impatto strategico.',
      type: resourceTypeById['res1'],
      level: 5,
	  mastery: 5,
      frame: { name: 'resource-dust-gold', effect: 'none' },
    },

    {
      id: 'resource-gem-red-octagon',
      itemType: 'resource',
      name: 'Gemma Rossa',
      description: 'Catalizzatore iniziale per sblocchi e upgrade speciali. Si usa quando un miglioramento richiede una risorsa più rara delle polveri comuni.',
      type: resourceTypeById['res2'],
      level: 1,
	  mastery: 1,
      frame: { name: 'resource-gem-red-octagon', effect: 'none' },
    },
    {
      id: 'resource-gem-blue-octagon',
      itemType: 'resource',
      name: 'Gemma Blu',
      description: 'Gemma intermedia per potenziamenti selettivi. Entra in gioco quando devi sostenere upgrade con requisiti più mirati o ricompense più alte.',
      type: resourceTypeById['res2'],
      level: 2,
	  mastery: 2,
      frame: { name: 'resource-gem-blue-octagon', effect: 'none' },
    },
    {
      id: 'resource-gem-green-octagon',
      itemType: 'resource',
      name: 'Gemma Verde',
      description: 'Catalizzatore avanzato per upgrade di metà-alta progressione. Serve quando il potenziamento richiede un investimento raro ma non ancora finale.',
      type: resourceTypeById['res2'],
      level: 3,
	  mastery: 3,
      frame: { name: 'resource-gem-green-octagon', effect: 'none' },
    },
    {
      id: 'resource-gem-purple-octagon',
      itemType: 'resource',
      name: 'Gemma Viola',
      description: 'Gemma rara per soglie di crescita importanti. Viene utilizzata quando un eroe o un equipaggiamento deve superare un blocco di potenza significativo.',
      type: resourceTypeById['res2'],
      level: 4,
	  mastery: 4,
      frame: { name: 'resource-gem-purple-octagon', effect: 'none' },
    },
    {
      id: 'resource-gem-gold-octagon',
      itemType: 'resource',
      name: 'Gemma Dorata',
      description: 'Catalizzatore premium per upgrade finali e sblocchi di valore elevato. Si conserva per gli interventi più costosi o decisivi.',
      type: resourceTypeById['res2'],
      level: 5,
	  mastery: 5,
      frame: { name: 'resource-gem-gold-octagon', effect: 'none' },
    },
  ];
  
  // -------------------------------------
  // Risorse raggruppate per tipoo
  // -------------------------------------
  
  export const resourceItemsByTypeMock = resourceItemsMock.reduce<
    Record<ResourceTypeId, ResourceItem[]>
  >(
    (acc, item) => {
      acc[item.type.id] ??= [];
      acc[item.type.id].push(item);
      return acc;
    },
    {} as Record<ResourceTypeId, ResourceItem[]>
  );
  
  // -------------------------------------
  // Risorse raggruppate per livello
  // -------------------------------------

  export const getResourceItemsByLevel = (
    level: number,
    resources: ResourceItem[] = resourceItemsMock
  ): ResourceItem[] => {
    return resources
      .filter((item) => item.level <= level)
      .sort((a, b) => {
        if (a.level !== b.level) {
          return a.level - b.level;
        }

        return a.name.localeCompare(b.name);
      });
  };
  
  // -------------------------------------
  // Risorse filtrate per livello e tipo
  // -------------------------------------
  
  export const getResourceItemsByLevelAndType = (
    level: number,
    typeId?: ResourceTypeId,
    resources: ResourceItem[] = resourceItemsMock
  ): ResourceItem[] => {
    return resources
      .filter((item) => {
        const matchLevel = item.level <= level;
        const matchType = typeId ? item.type.id === typeId : true;

        return matchLevel && matchType;
      })
      .sort((a, b) => {
        if (a.type.id !== b.type.id) {
          return a.type.id.localeCompare(b.type.id);
        }

        if (a.level !== b.level) {
          return a.level - b.level;
        }

        return a.name.localeCompare(b.name);
      });
  };
  
  
  // -------------------------------------
  // Risorse recuperate casualmente
  // -------------------------------------

  export const getRandomResourceItems = (
    count: number,
    resources: ResourceItem[] = resourceItemsMock
  ): ResourceItem[] => {
    return GameUtilsService.getRandomItemsFromList<ResourceItem>(resources, count);
  };
  
  /*
  ESEMPI
  const randomResources = getRandomResourceItems(3);

  const availableResources = getResourceItemsByLevel(3);
  const randomAvailableResources = getRandomResourceItems(2, availableResources);

  const onlyDust = getResourceItemsByLevelAndType(5, 'res1');
  const randomDust = getRandomResourceItems(2, onlyDust);
  */
