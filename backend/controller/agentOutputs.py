from pydantic import BaseModel, Field
from typing import Optional, List, Dict


class GeneralResponse(BaseModel):
    """Final structured general output"""
    planning_process: str = Field(
        description="Detailed explanation of the planning process")
    answer: str = Field(description="Answer to the user's query")


class NoteResponse(BaseModel):
    """Final structured notes output"""
    planning_process: str = Field(
        description="Detailed explanation of the planning process")
    research_method: str = Field(description="Method used for research")
    formatted_notes: str = Field(
        description="Complete formatted notes using markdown")


class ResearchResponse(BaseModel):
    """Final structured research notes output"""
    planning_process: str = Field(
        description="Detailed explanation of the planning and research methodology")
    formatted_notes: str = Field(
        description="Complete formatted notes with citations")
    bibliography: str = Field(description="Bibliography or reference section")


class StepResponse(BaseModel):
    """Final structured problem-solving output"""
    planning_process: str = Field(
        description="Problem-solving plan and approach")
    problem_identification: str = Field(
        description="Type of problem and key concepts involved")
    step_solution: str = Field(
        description="Step-by-step solution with clear explanations")
    visual_aids: Optional[str] = Field(
        description="Diagrams or visual aids when applicable", default=None)


class DiagramResponse(BaseModel):
    """Final structured diagram output"""
    planning_process: str = Field(
        description="Detailed diagram planning process")
    diagram_type_rationale: str = Field(
        description="Explanation of why this diagram type was chosen")
    diagram_code: str = Field(description="Complete Mermaid code")
    interpretation: str = Field(
        description="Brief explanation of how to interpret the diagram")


class FlashcardResponse(BaseModel):
    """Final structured flashcard output"""
    planning_process: str = Field(
        description="Planning approach to creating these flashcards")
    organization_approach: str = Field(
        description="How the content is organized and why")
    flashcards: List[Dict[str, str]] = Field(
        description="Complete set of flashcards in an organized format with 'front' and 'back' keys")
    study_tips: str = Field(
        description="Suggestions for effective study techniques")


class FeynmanResponse(BaseModel):
    """Final structured Feynman explanation output"""
    planning_process: str = Field(
        description="Planning process for simplifying this concept")
    core_concept: str = Field(description="Core concept to be explained")
    explanation: str = Field(
        description="Simplified explanation using the Feynman technique")
    examples: str = Field(
        description="Analogies, examples, and visual descriptions")
    summary: str = Field(description="Brief summary of the key takeaways")
