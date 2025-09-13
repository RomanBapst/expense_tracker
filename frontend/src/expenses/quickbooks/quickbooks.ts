

const baseUrlQbExpense = import.meta.env.VITE_APP_API_ADDR + "/createExpense";

export async function postQbExpense(payload: Any, token: string) {
  try {
    const response = await fetch(baseUrlQbExpense, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Handle 409 Conflict - expense already synced
      if (response.status === 409) {
        const entityType = errorData.details?.qbEntityType || 'QuickBooks';
        throw new Error(`This expense is already synced to ${entityType} (ID: ${errorData.details?.qbQbId || errorData.details?.qbExpenseId})`);
      }
      
      throw new Error(`Error: ${response.status} - ${errorData.error || errorData.message}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.log(err.message);
    throw err;
  }
}