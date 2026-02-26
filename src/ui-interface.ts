
export interface IUserInterface {
    showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;
    showErrorMessage(message: string): Promise<void>;
}

export const consoleUI: IUserInterface = {
    showInformationMessage: async (msg, ...items) => {
        console.log(`[INFO] ${msg}`);
        // CLI assumes 'Yes' for automation unless interactive flag (MVP simplicity)
        return items[0];
    },
    showErrorMessage: async (msg) => {
        console.error(`[ERROR] ${msg}`);
    }
};
