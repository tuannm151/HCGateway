from typing import Dict, Any, List

def transform_health_metrics(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform health metrics data by converting numeric fields into standardized metrics format.
    
    Args:
        data: Dictionary containing health data from Health Connect
        
    Returns:
        Transformed data with standardized metrics
    """
    metric_data = {}
    
    # Exclude metadata and time-related fields
    excluded_fields = {'metadata', 'time', 'startTime', 'endTime'}
    
    # Process all fields except excluded ones
    for key, value in data.items():
        if key not in excluded_fields:
            if isinstance(value, (int, float)):
                # Convert all numeric values to float to ensure type consistency
                metric_data[key] = float(value)
            elif isinstance(value, dict) and any(isinstance(v, (int, float)) for v in value.values()):
                # If the value is a dictionary containing numeric values, flatten it
                for sub_key, sub_value in value.items():
                    if isinstance(sub_value, (int, float)):
                        metric_data[f"{key}_{sub_key}"] = sub_value
    
    return metric_data

def transform_batch_metrics(data_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Transform a batch of health metrics data.
    
    Args:
        data_list: List of dictionaries containing health data
        
    Returns:
        List of transformed data with standardized metrics
    """
    return [transform_health_metrics(item) for item in data_list]