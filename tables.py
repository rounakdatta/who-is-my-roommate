from flask_table import Table, Col, LinkCol

class Results(Table):
    id = Col('Id', show=False)
    artist = Col('Room Number')
    #title = Col('Title')
    #release_date = Col('Release Date')
    #publisher = Col('Publisher')
    media_type = Col('Hostel')
    #edit = LinkCol('Edit', 'edit', url_kwargs=dict(id='id'))