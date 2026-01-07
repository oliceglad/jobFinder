from abc import ABC, abstractmethod

class BaseVacancyParser(ABC):

    @abstractmethod
    async def fetch_vacancies(self) -> list[dict]:
        pass
