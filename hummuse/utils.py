

months ={1:'Jan', 2:'Feb', 3:'Mar', 4:'Apr', 5:'May', 6:'Jun',
				7:'Jul', 8:'Aug', 9:'Sep', 10:'Oct', 11:'Nov', 12:'Dec'}
	
def get_prev_date(curr_date):
	# returns day and month of minus days before curr_date
	#curr_date (day, month, year) format
	day, month, year = curr_date
	if day>1:
		return (day-1, month, year)

	if day==1 and month>1:
		if month in [2, 4, 6, 8, 9, 11]:
			return (31, month-1, year)

		if month == 3:
			if 	year%4 == 0:
				return (29, 2, year)
			else:
				return (28, 2, year)

		else:
			return (30, month-1, year)

	if day==1 and month==1:
		return (31, 12, year-1)
							
			

def error_check_name(title):
	pass