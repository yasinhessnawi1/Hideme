import { OptionType } from '../types/types';

export function handleAllOPtions(selectedAiEntities : OptionType[], selectedGlinerEntities : OptionType[], selectedMlEntities : OptionType[]): {
    gemini: string[];
    gliner: string[];
    presidio: string[]
} {
    // Handle "ALL" entity selections
    let presidioEntitiesToSend: string[] = [];
    let glinerEntitiesToSend: string[] = [];
    let geminiEntitiesToSend: string[] = [];

    // Process presidio entities
    if (selectedMlEntities.some(e => e.value === 'ALL')) {
        // If ALL is selected, send null which the backend interprets as all entities
        presidioEntitiesToSend = [];
    } else if (selectedMlEntities.length > 0) {
        // Otherwise send the selected entities
        presidioEntitiesToSend = selectedMlEntities.map(e => e.value);
    }

    // Process gliner entities
    if (selectedGlinerEntities.some(e => e.value === 'ALL')) {
        glinerEntitiesToSend = [];
    } else if (selectedGlinerEntities.length > 0) {
        glinerEntitiesToSend = selectedGlinerEntities.map(e => e.value);
    }

    // Process gemini entities
    if (selectedAiEntities.some(e => e.value === 'ALL')) {
        geminiEntitiesToSend = [];
    } else if (selectedAiEntities.length > 0) {
        geminiEntitiesToSend = selectedAiEntities.map(e => e.value);
    }

    // Prepare entity selections for each model
    const detectionOptions = {
        presidio: presidioEntitiesToSend,
        gliner: glinerEntitiesToSend,
        gemini: geminiEntitiesToSend
    };
    return detectionOptions;
}
