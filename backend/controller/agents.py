from langchain.agents import create_react_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_tavily import TavilySearch
from langchain.chat_models import init_chat_model
from langgraph.prebuilt import create_react_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, FunctionMessage
from langchain_tavily import TavilySearch
from .utilities import process_file
from .agentOutputs import GeneralResponse, NoteResponse, ResearchResponse, StepResponse, DiagramResponse, FlashcardResponse, FeynmanResponse
import json
from typing import List, Dict, Any, Optional
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain.agents.format_scratchpad import format_to_openai_function_messages
from langchain_core.agents import AgentActionMessageLog, AgentFinish
import os
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import START, MessagesState, StateGraph

from dotenv import load_dotenv
from functools import partial
import re

load_dotenv()

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
os.environ["OPENAI_API_KEY"] = OPENAI_API_KEY
os.environ["TAVILY_API_KEY"] = TAVILY_API_KEY
if not TAVILY_API_KEY or not OPENAI_API_KEY:
    raise ValueError("Missing TAVILY_API_KEY or OPENAI_API_KEY in .env")

tool = TavilySearch(
    max_results=5,
    include_images=True,
    search_depth="advanced",
)

llm = init_chat_model("gpt-4o", api_key=OPENAI_API_KEY,
                      temperature=.7, max_tokens=7500)

tools = [tool]

cot_planning_template = """
Before answering, I will take these planning steps:

1. STEP PLANNING:
   - Break down this task into clear, logical steps
   - For each step, determine what information or analysis is needed
   - Identify which tools might be useful at each step

2. INFORMATION GATHERING:
   - Determine what information I already know about this topic
   - Identify knowledge gaps that require research
   - Plan specific searches to fill those knowledge gaps

3. ANALYSIS & ORGANIZATION:
   - Plan how to structure the information for maximum clarity
   - Determine the best format for presenting this information
   - Consider how to connect concepts logically

4. OUTPUT PREPARATION:
   - Plan the format and structure of my final response
   - Ensure all requirements from the instructions are addressed
   - Consider how to make the output most useful for the user
   - DO NOT GIVE ME A DIRECT RESPONSE. I want you to follow the structured output format. 
"""


def parse_output(output, response_class):
    if "function_call" not in output.additional_kwargs:
        # Create a properly structured response when function_call is missing
        if response_class == GeneralResponse:
            return AgentFinish(return_values={"planning_process": "Direct response without explicit planning", "answer": output.content}, log=output.content)
        elif response_class == NoteResponse:
            return AgentFinish(return_values={"planning_process": "Direct response without explicit planning", "research_method": "Direct knowledge", "formatted_notes": output.content}, log=output.content)
        elif response_class == ResearchResponse:
            return AgentFinish(return_values={"planning_process": "Direct response without explicit planning", "formatted_notes": output.content, "bibliography": "No bibliography provided"}, log=output.content)
        elif response_class == StepResponse:
            return AgentFinish(return_values={"planning_process": "Direct response without explicit planning", "problem_identification": "Problem solved directly", "step_solution": output.content, "visual_aids": None}, log=output.content)
        elif response_class == DiagramResponse:
            return AgentFinish(return_values={"planning_process": "Direct response without explicit planning", "diagram_type_rationale": "Direct response", "diagram_code": output.content, "interpretation": "No explicit interpretation provided"}, log=output.content)
        elif response_class == FlashcardResponse:
            return AgentFinish(return_values={"planning_process": "Direct response without explicit planning", "organization_approach": "Direct response", "flashcards": [{"front": "Question", "back": output.content}], "study_tips": "No study tips provided"}, log=output.content)
        elif response_class == FeynmanResponse:
            return AgentFinish(return_values={"planning_process": "Direct response without explicit planning", "core_concept": "Direct response", "explanation": output.content, "examples": "No specific examples provided", "summary": "No explicit summary provided"}, log=output.content)
        else:
            # Default fallback
            return AgentFinish(return_values={"output": output.content}, log=output.content)

    function_call = output.additional_kwargs["function_call"]
    name = function_call["name"]
    inputs = json.loads(function_call["arguments"])

    if name == response_class.__name__:
        # Validate and ensure all required fields are present in the response
        for field in response_class.__fields__:
            if field not in inputs:
                # Add missing fields with default values
                if field in response_class.__fields__ and response_class.__fields__[field].default is not None:
                    inputs[field] = response_class.__fields__[field].default
                else:
                    inputs[field] = f"No {field} provided"

        return AgentFinish(return_values=inputs, log=str(function_call))
    else:
        return AgentActionMessageLog(
            tool=name, tool_input=inputs, log="", message_log=[output]
        )


def parse_note_output(output):
    return parse_output(output, NoteResponse)


def parse_research_output(output):
    return parse_output(output, ResearchResponse)


def parse_step_output(output):
    return parse_output(output, StepResponse)


def parse_diagram_output(output):
    return parse_output(output, DiagramResponse)


def parse_flashcard_output(output):
    """Parse output specifically for flashcard agent"""
    if "function_call" not in output.additional_kwargs:
        # Check if the output contains a JSON array that might be flashcards
        content = output.content
        flashcards = []

        # Try to find a JSON array in the content
        match = re.search(r"\[\s*{\s*['\"]front['\"][\s\S]*?\}\s*\]", content)
        if match:
            try:
                # Replace single quotes with double quotes for valid JSON
                json_str = match.group(0).replace("'", "\"")
                flashcards = json.loads(json_str)
            except json.JSONDecodeError:
                pass

        # If no JSON array is found, try to extract flashcards from structured text
        if not flashcards:
            # Look for numbered or bulleted flashcard-like patterns
            front_back_pairs = re.findall(
                r"(?:^|\n)(?:\d+\.|\*|\-)\s*(?:Q:|Question:|Front:)?\s*(.*?)\s*(?:A:|Answer:|Back:)?\s*(.*?)(?=\n(?:\d+\.|\*|\-|$)|\Z)", content)

            if front_back_pairs:
                flashcards = [{"front": front.strip(), "back": back.strip()}
                              for front, back in front_back_pairs if front.strip() and back.strip()]

        # If we still don't have flashcards, create a fallback one
        if not flashcards:
            flashcards = [{"front": "What are Markov Decision Processes?",
                           "back": "Fallback answer: Please review the content for details on MDPs."}]

        return AgentFinish(
            return_values={
                "planning_process": "Direct response without explicit planning",
                "organization_approach": "Direct organization approach",
                "flashcards": flashcards,
                "study_tips": "Review the flashcards regularly using spaced repetition."
            },
            log=output.content
        )

    # Regular function call handling (unchanged)
    function_call = output.additional_kwargs["function_call"]
    name = function_call["name"]
    inputs = json.loads(function_call["arguments"])

    if name == "FlashcardResponse":
        # Validate and ensure all required fields are present in the response
        for field in FlashcardResponse.__fields__:
            if field not in inputs:
                # Add missing fields with default values
                if field in FlashcardResponse.__fields__ and FlashcardResponse.__fields__[field].default is not None:
                    inputs[field] = FlashcardResponse.__fields__[field].default
                else:
                    inputs[field] = f"No {field} provided"

        # Special handling for flashcards field
        if "flashcards" in inputs and (inputs["flashcards"] == "No flashcards provided" or inputs["flashcards"] == []):
            # Create default flashcards if none provided
            inputs["flashcards"] = [
                {"front": "What are Markov Decision Processes?",
                    "back": "Mathematical framework for modeling decision-making when outcomes are partly random and partly controlled by the decision maker."},
                {"front": "What are the key components of an MDP?",
                    "back": "States, Actions, Transition probabilities, Rewards, and Policy."}
            ]

        return AgentFinish(return_values=inputs, log=str(function_call))
    else:
        return AgentActionMessageLog(
            tool=name, tool_input=inputs, log="", message_log=[output]
        )


def parse_feynman_output(output):
    return parse_output(output, FeynmanResponse)


def parse_general_output(output):
    return parse_output(output, GeneralResponse)


def create_note_taking_agent():
    system_prompt = f"""You are an expert note-taking assistant that creates clear, concise, and well-structured notes.


{cot_planning_template}

INSTRUCTIONS:
1. Research the topic thoroughly using your knowledge or web search when necessary
2. Create comprehensive, well-organized notes with clear headings and subheadings. Add all formulas, relevant information, caveats and devices to help you remember each topic in detail.
3. Include relevant examples or analogies when helpful
4. Add diagrams or formulas when applicable
5. Focus on accuracy and educational value
6. Format using markdown for readability, for equations use latex

When returning your notes, use the structured output format with these fields:
- planning_process: Detailed explanation of your planning process
- research_method: Method used for research
- formatted_notes: Complete formatted notes using markdown. Render equations using latex.
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    llm_with_tools = llm.bind_functions([tool, GeneralResponse])

    agent = (
        {
            "messages": lambda x: x["messages"],
            "agent_scratchpad": lambda x: format_to_openai_function_messages(
                x["intermediate_steps"]
            ),
        }
        | prompt
        | llm_with_tools
        | parse_general_output
    )

    return AgentExecutor(tools=[tool], agent=agent, verbose=True)


def create_research_agent():
    system_prompt = f"""You are an expert research-based note-taking assistant that creates comprehensive notes with proper citations.

{cot_planning_template}

INSTRUCTIONS:
1. Research the topic thoroughly using web search for up-to-date information
2. Include proper citations for all external information
3. Create comprehensive, well-organized notes with clear headings and subheadings, and add all formulas, relevant information, caveats etc
4. Focus on accuracy and scholarly value
5. Format using markdown for readability, including proper citation format
6. For scientific topics, include recent research findings when applicable

When returning your notes, use the structured output format with these fields:
- planning_process: Detailed explanation of your planning and research methodology
- formatted_notes: Complete formatted notes with citations in markdown format
- bibliography: Bibliography or reference section
- Render equations using latex. Output in markdown format.
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    llm_with_tools = llm.bind_functions([tool, ResearchResponse])

    agent = (
        {
            "messages": lambda x: x["messages"],
            "agent_scratchpad": lambda x: format_to_openai_function_messages(
                x["intermediate_steps"]
            ),
        }
        | prompt
        | llm_with_tools
        | parse_research_output
    )

    return AgentExecutor(tools=[tool], agent=agent, verbose=True)


def create_step_agent():
    system_prompt = f"""You are an expert step-by-step problem-solving assistant that breaks down complex problems.

{cot_planning_template}

INSTRUCTIONS:
1. Break down problems into clear, logical steps on how to solve them
2. For math/physics/technical problems, show all work and calculations
3. Explain the reasoning behind each step
4. Use web search when necessary to verify formulas or approaches
5. For equations use latex formatting
6. Include examples to illustrate concepts when helpful

When returning your solution, use the structured output format with these fields:
- planning_process: Detailed explanation of your problem-solving plan and approach
- problem_identification: Type of problem and key concepts involved
- step_solution: Step-by-step solution with clear explanations in markdown format
- visual_aids: Diagrams or visual aids when applicable (optional)
- Render equations using latex.
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    llm_with_tools = llm.bind_functions([tool, StepResponse])

    agent = (
        {
            "messages": lambda x: x["messages"],
            "agent_scratchpad": lambda x: format_to_openai_function_messages(
                x["intermediate_steps"]
            ),
        }
        | prompt
        | llm_with_tools
        | parse_step_output
    )

    return AgentExecutor(tools=[tool], agent=agent, verbose=True)


def create_diagram_agent():
    system_prompt = f"""You are an expert diagram-generating assistant that creates clear, informative diagrams.

{cot_planning_template}

INSTRUCTIONS:
1. Research the topic thoroughly using your knowledge or web search when necessary
2. Create appropriate diagrams that best represent the concept
3. Use Mermaid syntax for flowcharts, sequence diagrams, class diagrams, etc.
4. Focus on clarity and educational value
5. Explain the key components of your diagram
6. Always verify that your Mermaid syntax is valid

IMPORTANT: The diagram_code MUST be provided as raw Mermaid code without the markdown code block delimiters - do NOT include the ```mermaid and ``` tags.

When returning your diagram, use the structured output format with these fields:
- planning_process: Detailed explanation of your diagram planning process
- diagram_type_rationale: Description of why you chose this particular diagram type
- diagram_code: Complete Mermaid code, provided as raw code without markdown delimiters
- interpretation: Brief explanation of how to interpret the diagram
- Render equations using latex.
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    llm_with_tools = llm.bind_functions([tool, DiagramResponse])

    agent = (
        {
            "messages": lambda x: x["messages"],
            "agent_scratchpad": lambda x: format_to_openai_function_messages(
                x["intermediate_steps"]
            ),
        }
        | prompt
        | llm_with_tools
        | parse_diagram_output
    )

    return AgentExecutor(tools=[tool], agent=agent, verbose=True)


def create_flashcard_agent():
    system_prompt = f"""You are an expert flashcard-generating assistant that creates effective study materials.

{cot_planning_template}

INSTRUCTIONS:
1. Research the topic thoroughly using your knowledge or web search when necessary
2. Create comprehensive yet concise question-answer pairs
3. Cover all important aspects of the topic
4. Ensure questions are specific and clear
5. Organize flashcards by subtopic when applicable
6. Include a mix of definitional, conceptual, and application questions

When returning your flashcards, use the structured output format with these fields:
- planning_process: Detailed explanation of your planning approach
- organization_approach: Description of how you've organized the content and why
- flashcards: Complete set of flashcards in an organized format in json with two keys front: "question", back: "answer"
- study_tips: Suggestions for effective study techniques
- Render equations using latex.
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    llm_with_tools = llm.bind_functions([tool, FlashcardResponse])

    agent = (
        {
            "messages": lambda x: x["messages"],
            "agent_scratchpad": lambda x: format_to_openai_function_messages(
                x["intermediate_steps"]
            ),
        }
        | prompt
        | llm_with_tools
        | parse_flashcard_output
    )

    return AgentExecutor(tools=[tool], agent=agent, verbose=True)


def create_feynman_agent():
    system_prompt = f"""You are an expert Feynman technique assistant that simplifies complex concepts.

{cot_planning_template}

INSTRUCTIONS:
1. Research the topic thoroughly using your knowledge or web search when necessary
2. Explain the concept as if teaching it to someone with no background in the subject
3. Use simple language and avoid jargon
4. Incorporate relatable analogies and concrete examples
5. Break down complex ideas into their simplest components
6. Identify and address common misconceptions

When returning your explanation, use the structured output format with these fields:
- planning_process: Detailed explanation of your planning process
- core_concept: Core concept to be explained
- explanation: Simplified explanation using the Feynman technique
- examples: Analogies, examples, and visual descriptions
- summary: Brief summary of the key takeaways 
- all in markdown format. Render equations using latex.
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    llm_with_tools = llm.bind_functions([tool, FeynmanResponse])

    agent = (
        {
            "messages": lambda x: x["messages"],
            "agent_scratchpad": lambda x: format_to_openai_function_messages(
                x["intermediate_steps"]
            ),
        }
        | prompt
        | llm_with_tools
        | parse_feynman_output
    )

    return AgentExecutor(tools=[tool], agent=agent, verbose=True)


def create_general_agent():
    system_prompt = f"""You are an expert assistant that answers the User's query in detail, and can search the web if needed
    {cot_planning_template}
    
    INSTRUCTIONS:
    1. Answer the User's query in detail
    2. If needed search the web for the answer
    3. When the user asks a follow-up question, remember to consider our previous conversation
    """

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="messages"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    llm_with_tools = llm.bind_functions([tool, GeneralResponse])

    agent = (
        {
            "messages": lambda x: x["messages"],
            "agent_scratchpad": lambda x: format_to_openai_function_messages(
                x["intermediate_steps"]
            ),
        }
        | prompt
        | llm_with_tools
        | parse_general_output
    )

    return AgentExecutor(tools=[tool], agent=agent, verbose=True)


general_agent = create_general_agent()
note_agent = create_note_taking_agent()
research_agent = create_research_agent()
step_agent = create_step_agent()
diagram_agent = create_diagram_agent()
flashcard_agent = create_flashcard_agent()
feynman_agent = create_feynman_agent()


def extract_structured_content(content, agent_type, expected_fields):
    """
    Extract structured content from LLM responses based on section headers.

    Args:
        content (str): The content to extract from
        agent_type (str): The type of agent
        expected_fields (list): List of expected fields for this agent type

    Returns:
        dict: Extracted structured content
    """
    structured_result = {}

    # Check if content has nested sections by looking for section headers
    has_nested_content = any(
        re.search(f"## {field}", content.lower()) for field in expected_fields)

    # Special handling for diagram agent - extract mermaid code blocks
    if agent_type == "diagram":
        mermaid_match = re.search(r"```mermaid\s*([\s\S]*?)\s*```", content)
        if mermaid_match:
            # Extract raw mermaid code without the delimiters
            structured_result["diagram_code"] = mermaid_match.group(1).strip()
        else:
            # Try to find raw mermaid code without code blocks
            graph_match = re.search(
                r"(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph)\s+[\s\S]+", content)
            if graph_match:
                structured_result["diagram_code"] = graph_match.group(
                    0).strip()

    # Special handling for flashcard agent - try to extract JSON arrays
    if agent_type == "flashcard" and "flashcards" in expected_fields:
        # Try multiple JSON patterns to extract flashcards
        json_patterns = [
            # Standard JSON array format
            r"\[\s*{\s*\"front\"[\s\S]*?\}\s*\]",
            # JSON array with single quotes
            r"\[\s*{\s*'front'[\s\S]*?\}\s*\]",
            # Markdown table format (will need conversion)
            r"\| *Front *\| *Back *\|[\s\S]*?\n\|[-\s]*\|[-\s]*\|([\s\S]*?)(?=\n\n|\Z)"
        ]

        for pattern in json_patterns:
            match = re.search(pattern, content)
            if match:
                try:
                    if pattern.startswith(r"\| *Front"):
                        # Convert markdown table to JSON
                        table_content = match.group(1)
                        rows = table_content.strip().split('\n')
                        flashcards = []

                        for row in rows:
                            cells = row.split('|')
                            if len(cells) >= 3:  # Should have at least 3 parts with our split
                                front = cells[1].strip()
                                back = cells[2].strip()
                                if front and back:  # Ensure non-empty
                                    flashcards.append(
                                        {"front": front, "back": back})
                    else:
                        # Standard JSON parsing
                        json_str = match.group(0)
                        # Replace single quotes with double quotes for valid JSON
                        json_str = json_str.replace("'", "\"")
                        flashcards = json.loads(json_str)

                    structured_result["flashcards"] = flashcards
                    break
                except (json.JSONDecodeError, IndexError) as e:
                    print(f"Failed to parse flashcards: {e}")
                    continue

        # If we still don't have flashcards, try to build them from structured text
        if "flashcards" not in structured_result:
            # Look for numbered or bulleted flashcard-like patterns
            front_back_pairs = re.findall(
                r"(?:^|\n)(?:\d+\.|\*|\-)\s*(?:Q:|Question:|Front:)?\s*(.*?)\s*(?:A:|Answer:|Back:)?\s*(.*?)(?=\n(?:\d+\.|\*|\-|$)|\Z)", content)

            if front_back_pairs:
                flashcards = [{"front": front.strip(), "back": back.strip()}
                              for front, back in front_back_pairs if front.strip() and back.strip()]
                if flashcards:
                    structured_result["flashcards"] = flashcards

    # If we detected nested content, extract each section
    if has_nested_content:
        for field in expected_fields:
            # Try multiple patterns for section headers (case-insensitive)
            field_pattern = f"## {field.replace('_', ' ')}"
            alt_field_pattern = f"## {field}"

            patterns = [
                re.search(
                    f"{field_pattern}\s*([\s\S]*?)(?=##|\Z)", content.lower()),
                re.search(
                    f"{alt_field_pattern}\s*([\s\S]*?)(?=##|\Z)", content.lower()),
                re.search(
                    f"{field}:\s*([\s\S]*?)(?=\n\n[a-z_]+:|\Z)", content.lower())
            ]

            # Use the first successful match
            for match in patterns:
                if match:
                    extracted_content = match.group(1).strip()
                    structured_result[field] = extracted_content
                    break
    else:
        # If no nested content, extract section headers at the top level
        for field in expected_fields:
            # Convert field name to lowercase for case-insensitive matching
            field_pattern = f"## {field.replace('_', ' ')}"
            alt_field_pattern = f"## {field}"

            patterns = [
                re.search(
                    f"{field_pattern}\s*([\s\S]*?)(?=##|\Z)", content.lower()),
                re.search(
                    f"{alt_field_pattern}\s*([\s\S]*?)(?=##|\Z)", content.lower()),
                re.search(
                    f"{field}:\s*([\s\S]*?)(?=\n\n[a-z_]+:|\Z)", content.lower())
            ]

            for match in patterns:
                if match:
                    structured_result[field] = match.group(1).strip()
                    break

    return structured_result


def process_agent_result(result, agent_type, expected_fields):
    """
    Process agent result to ensure consistent and clean structure

    Args:
        result (dict): Raw agent result
        agent_type (str): Type of agent
        expected_fields (list): Expected fields for this agent type

    Returns:
        dict: Processed result with clean structure
    """
    processed_result = {}

    # Check for nested content in any field
    has_nested_content = False
    for field in result:
        if field in expected_fields and isinstance(result[field], str):
            if any(re.search(f"## {nested_field}", result[field].lower()) for nested_field in expected_fields):
                has_nested_content = True
                nested_content = result[field]
                break

    # If we found nested content, extract it
    if has_nested_content:
        extracted = extract_structured_content(
            nested_content, agent_type, expected_fields)

        # Merge extracted content with existing result, prioritizing extracted content
        for field in expected_fields:
            if field in extracted and extracted[field]:
                processed_result[field] = extracted[field]
            elif field in result:
                processed_result[field] = result[field]
            else:
                processed_result[field] = f"No {field} provided"
    else:
        # No nested content, just ensure all expected fields exist
        for field in expected_fields:
            if field in result:
                processed_result[field] = result[field]
            else:
                processed_result[field] = f"No {field} provided"

    # Special handling for diagram agent - ensure diagram_code is raw Mermaid code
    if agent_type == "diagram" and "diagram_code" in processed_result:
        # Remove any markdown code block delimiters
        diagram_code = processed_result["diagram_code"]
        # Strip markdown code block syntax if present
        diagram_code = re.sub(r'```mermaid\s*', '', diagram_code)
        diagram_code = re.sub(r'\s*```$', '', diagram_code)
        diagram_code = diagram_code.strip()
        processed_result["diagram_code"] = diagram_code

    return processed_result


def run_agent_file_content(topic_request, file_content=None, agent_type="note", session_id=None, chat_history=None):
    """
    Run the specified agent with the given topic and optional files, maintaining conversation history.

    Args:
        topic_request (str): The topic to process
        file_content (list): Optional list of file content after uploading
        agent_type (str): Type of agent to use 
        session_id (str): Optional session ID for persistence
        chat_history (list): Optional list of previous messages

    Returns:
        dict: Structured output from the agent
    """
    agent_map = {
        "note": note_agent,
        "research": research_agent,
        "step": step_agent,
        "diagram": diagram_agent,
        "flashcard": flashcard_agent,
        "feynman": feynman_agent,
        "general": general_agent
    }

    selected_agent = agent_map.get(agent_type)
    if not selected_agent:
        raise ValueError(f"Unknown agent type: {agent_type}")

    if chat_history is None:
        chat_history = []

    langchain_messages = []
    for message in chat_history:
        if message['type'] == 'human':
            langchain_messages.append(HumanMessage(content=message['content']))
        elif message['type'] == 'ai':
            langchain_messages.append(AIMessage(content=message['content']))

    if file_content:
        message_content = f"Please process this topic: {topic_request}. Use the following file content as reference:\n\n{file_content}"
    else:
        message_content = f"Please process this topic: {topic_request}"

    new_message = HumanMessage(content=message_content)

    messages = langchain_messages + [new_message]

    result = selected_agent.invoke(
        {
            "messages": messages
        }
    )

    chat_history.append({"type": "human", "content": message_content})

    # Clean up the result to ensure it has the correct structure
    if isinstance(result, dict):
        # Define the expected fields for each agent type
        expected_fields = {
            "general": ["planning_process", "answer"],
            "note": ["planning_process", "research_method", "formatted_notes"],
            "research": ["planning_process", "formatted_notes", "bibliography"],
            "step": ["planning_process", "problem_identification", "step_solution", "visual_aids"],
            "diagram": ["planning_process", "diagram_type_rationale", "diagram_code", "interpretation"],
            "flashcard": ["planning_process", "organization_approach", "flashcards", "study_tips"],
            "feynman": ["planning_process", "core_concept", "explanation", "examples", "summary"]
        }

        # Check for combined fields and split if needed
        result = process_agent_result(
            result, agent_type, expected_fields[agent_type])

        # If there's an "output" field but we're expecting structured fields
        if "output" in result and agent_type in expected_fields:
            content = result["output"]

            # Extract structured content using our helper function
            structured_result = extract_structured_content(
                content, agent_type, expected_fields[agent_type])

            # Fill in missing fields with defaults
            for field in expected_fields[agent_type]:
                if field not in structured_result:
                    if field in result:
                        structured_result[field] = result[field]
                    elif field == expected_fields[agent_type][-1] and not any(f in expected_fields[agent_type][-1] for f in structured_result):
                        # If last field isn't extracted and has special content, use all content
                        structured_result[field] = content
                    else:
                        structured_result[field] = f"No {field} provided"

            result = structured_result

        # If we got answer but need a different structure
        elif "answer" in result and agent_type != "general":
            content = result["answer"]

            # Extract structured content using our helper function
            structured_result = extract_structured_content(
                content, agent_type, expected_fields[agent_type])

            # Fill in missing fields with defaults
            for field in expected_fields[agent_type]:
                if field not in structured_result:
                    if field == "planning_process" and "planning_process" in result:
                        structured_result[field] = result["planning_process"]
                    elif field == expected_fields[agent_type][-1] and not any(f in expected_fields[agent_type][-1] for f in structured_result):
                        # If last field isn't extracted, use all content
                        structured_result[field] = content
                    else:
                        structured_result[field] = f"No {field} provided"

            result = structured_result

        # Ensure the result is clean and well-structured
        result = process_agent_result(
            result, agent_type, expected_fields[agent_type])

        # Determine AI content for chat history
        ai_content = ""
        if agent_type == "general" and "answer" in result:
            ai_content = result["answer"]
        elif agent_type == "note" and "formatted_notes" in result:
            ai_content = result["formatted_notes"]
        elif agent_type == "research" and "formatted_notes" in result:
            ai_content = result["formatted_notes"]
        elif agent_type == "step" and "step_solution" in result:
            ai_content = result["step_solution"]
        elif agent_type == "diagram" and "diagram_code" in result:
            ai_content = result["diagram_code"]
        elif agent_type == "flashcard" and "flashcards" in result:
            ai_content = json.dumps(result["flashcards"], indent=2)
        elif agent_type == "feynman" and "explanation" in result:
            ai_content = result["explanation"]
        elif "output" in result:
            ai_content = result["output"]
        else:
            ai_content = str(result)

        chat_history.append({"type": "ai", "content": ai_content})

    return result, chat_history
